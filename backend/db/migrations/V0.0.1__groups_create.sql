create table if not exists "groups" (
    id serial primary key,
    signature varchar(255) not null,
    name varchar(255) not null,
    description text,
    created_at timestamp default (now() at time zone 'utc'),
    created_by varchar(255) default 'system',
    updated_at timestamp,
    updated_by varchar(255),
    constraint uq_groups_signature unique (signature)
);