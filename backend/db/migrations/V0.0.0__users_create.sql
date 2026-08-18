create table if not exists "users"
(
    id         bigserial primary key,
    signature  varchar(100) not null,
    email      varchar(255) not null,
    password   varchar(512),
    lang       varchar(10),
    timezone   varchar(255),
    first_name varchar(100),
    last_name  varchar(100),
    status     varchar(20)  not null, -- active, inactive, pending
    created_at timestamp default (now() at time zone 'utc'),
    created_by text      default 'system',
    updated_at timestamp,
    updated_by text,
    constraint uq_users_email unique (email),
    constraint uq_users_signature unique (signature)
);

