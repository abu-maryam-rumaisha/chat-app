create table conversations
(
    id         bigserial primary key,
    group_id   bigint,
    user_id    bigint,
    is_deleted boolean      default false,
    created_at timestamp    default (now() at time zone 'utc'),
    created_by varchar(255) default 'system',
    updated_at timestamp,
    updated_by varchar(255),
    constraint fk_conversations_group_id foreign key (group_id) references groups (id),
    constraint fk_conversations_user_id foreign key (user_id) references users (id)
);

create table user_conversations
(
    id              bigserial primary key,
    position        int    not null,
    user_id         bigint not null,
    conversation_id bigint not null,
    created_at      timestamp    default (now() at time zone 'utc'),
    created_by      varchar(255) default 'system',
    updated_at      timestamp,
    updated_by      varchar(255),
    constraint uq_user_conversations_user_id_conversation_id unique (user_id, conversation_id),
    constraint uq_user_conversations_conversation_id_position unique (conversation_id, position),
    constraint fk_user_conversations_user_id foreign key (user_id) references users (id),
    constraint fk_user_conversations_conversation_id foreign key (conversation_id) references conversations (id)
);

create table conversation_messages
(
    id                   bigint primary key,
    conversation_id      bigint    not null,
    message              text      not null,
    user_conversation_id bigint    not null,
    record_at            timestamp not null,
    red                  bigint[]  not null,
    created_at           timestamp    default (now() at time zone 'utc'),
    created_by           varchar(255) default 'system',
    updated_at           timestamp,
    updated_by           varchar(255),
    constraint fk_conversation_messages_user_conversation_id foreign key (user_conversation_id) references user_conversations (id),
    constraint fk_conversation_messages_conversation_id foreign key (conversation_id) references conversations (id)
)