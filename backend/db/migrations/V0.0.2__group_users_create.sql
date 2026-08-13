create table if not exists "group_users"
(
    id         serial primary key,
    group_id   bigint not null,
    user_id    bigint not null,
    timezone   varchar(100),
    joined_at  timestamp not null,
    is_admin   boolean      default false,
    created_at timestamp    default (now() at time zone 'utc'),
    created_by varchar(255) default 'system',
    updated_at timestamp    default now(),
    updated_by varchar(255),
    constraint fk_group_users_group_id foreign key (group_id) references "groups" (id) on delete cascade,
    constraint fk_group_users_user_id foreign key (user_id) references "users" (id) on delete cascade,
    constraint uq_group_users_group_id_user_id unique (group_id, user_id)
);