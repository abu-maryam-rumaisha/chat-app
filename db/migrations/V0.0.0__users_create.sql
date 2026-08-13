create table if not exists "user"(
    id varchar(255) primary key,
    email varchar(255) not null,
    password text not null,
    first_name text not null,
    last_name text,
    chat_seq bigint,
    created_at timestamp not null,
    created_by text not null,
    updated_at timestamp,
    updated_by text
);

