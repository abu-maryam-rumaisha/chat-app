package com.rabbani.chatapp.v1.util;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.lang.ref.SoftReference;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;
import java.util.function.Predicate;

import static java.time.Duration.ofMinutes;

@Slf4j
public class CacheManager {

    private static final CacheManager INSTANCE = new CacheManager();

    private final Map<String,CacheImpl<?,?>> cachesInstances;

    private long cleanerInterval;

    private final ReentrantLock lockCleaner;

    private final Condition conditionCleaner;

    private CacheManager(){
        cachesInstances = new ConcurrentHashMap<>();
        lockCleaner = new ReentrantLock();
        conditionCleaner = lockCleaner.newCondition();
        cleanerInterval = ofMinutes(30).toMillis();

        Thread cleaner = new Thread(this::cleanerProcess);
        cleaner.setDaemon(true);
        cleaner.setName("CacheManager-Compactor");
        cleaner.start();
    }

    public static CacheManager getInstance(){
        return INSTANCE;
    }

    public void setCleanerInterval(long cleanerIntervalInMillis){
        this.cleanerInterval = cleanerIntervalInMillis;
        try{
            lockCleaner.lock();
            if(lockCleaner.hasWaiters(conditionCleaner)){
                conditionCleaner.signalAll();
            }
        }
        finally {
            lockCleaner.unlock();
        }
    }

    private void cleanerProcess(){
        while(true){
            try{
                lockCleaner.lock();
                boolean hasChange = conditionCleaner.await(cleanerInterval, TimeUnit.MILLISECONDS);
                if(!hasChange){
                    cachesInstances.values().forEach(CacheImpl::shrink);
                }
            }
            catch (Exception e){
                log.error("error",e);
            }
            finally {
                lockCleaner.unlock();
            }
        }
    }

    public <V>Cache<String,V> newInstance(String name,long ttlInMillis){
        CacheImpl<String,V> cache = new CacheImpl<>(ttlInMillis);
        cachesInstances.put(name,cache);
        return cache;
    }


    public interface Cache<K,V>{

        V get(K id,Predicate<V> isFresh,Function<K,V> supplier);

        void remove(K id);
    }

    private static class CacheImpl<K,V> implements Cache<K,V>{

        private final ConcurrentHashMap<K,SoftReference<Timestamped<V>>> storage;

        private final long ttl;

        public CacheImpl(long ttlInMillis) {
            this.storage = new ConcurrentHashMap<> ();
            ttl = ttlInMillis;
        }

        @Override
        public V get(K id,Predicate<V> isFresh, Function<K,V> supplier) {
            Timestamped<V> holder;
            do{
                SoftReference<Timestamped<V>> ref =
                        storage.computeIfAbsent(id,k->new SoftReference<>(
                                Timestamped.of(supplier.apply(k),System.currentTimeMillis())
                        ));

                holder = ref.get();
                if(holder ==  null || !isFresh.test(holder.value)){
                    ref.enqueue();
                    holder = storage.computeIfPresent(id,(key, existingRef) -> {
                        Timestamped<V> newValue = existingRef.get();
                        if(newValue != null && isFresh.test(newValue.value)){
                            return existingRef;
                        }

                        existingRef.enqueue();
                        return new SoftReference<>(Timestamped.of(supplier.apply(key),System.currentTimeMillis()));
                    }).get();
                }
            }
            while (holder == null);

            return holder.value;
        }

        @Override
        public void remove(K id){
            storage.remove(id);
        }

        private void shrink() {
            Iterator<K> iterators = storage.keySet().iterator();
            while (iterators.hasNext()) {
                K key = iterators.next();
                SoftReference<Timestamped<V>> ref = storage.get(key);
                Timestamped<V> holder = ref.get();
                if (holder == null || (System.currentTimeMillis() - holder.timestamp) > ttl) {
                    iterators.remove();
                }
            }
        }
    }


    @AllArgsConstructor
    public static class Timestamped<T>{

        public final T value;
        public final long timestamp;

        static <T>Timestamped<T> of(T value,long timestamp){
            return new Timestamped<>(value,timestamp);
        }
    }

}
