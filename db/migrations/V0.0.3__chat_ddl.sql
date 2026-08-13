create table conversation
(
    id         varchar(255) primary key,
    created_at timestamp,
    created_by varchar(255),
    updated_at timestamp,
    updated_by varchar(255)
);

create table conversation_user
(
    id              varchar(255) primary key,
    conversation_id varchar(255) not null,
    user_id         varchar(255) not null,
    qualifier       int          not null,
    created_at      timestamp,
    created_by      varchar(255),
    updated_at      timestamp,
    updated_by      varchar(255),
    unique (conversation_id, user_id)
);

create table conversation_message
(
    id              varchar(255) primary key,
    conversation_id varchar(255) not null references conversation (id),
    message         text         not null,
    user_id         varchar(255) not null references "user" (id),
    red             bigint[]     not null,
    created_at      timestamp,
    created_by      varchar(255),
    updated_at      timestamp,
    updated_by      varchar(255)
)