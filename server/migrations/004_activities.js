/**
 * 校友活动/聚会模块表
 * @eslint
 * global exports, pgm
 */
/* eslint no-undef: "off" */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  pgm.createTable('activities', {
    id: 'id',
    title: { type: 'varchar(200)', notNull: true },
    description: { type: 'text' },
    type: { type: 'varchar(20)', notNull: true, default: "'other'" },
    location: { type: 'varchar(200)' },
    start_time: { type: 'timestamptz', notNull: true },
    end_time: { type: 'timestamptz' },
    capacity: { type: 'int', default: 100 },
    registered_count: { type: 'int', default: 0 },
    status: { type: 'varchar(20)', notNull: true, default: "'open'" },
    creator_id: { type: 'uuid', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('activity_registrations', {
    id: 'id',
    activity_id: { type: 'uuid', notNull: true, references: 'activities(id)', onDelete: 'CASCADE' },
    alumni_id: { type: 'uuid', notNull: true },
    alumni_name: { type: 'varchar(100)' },
    status: { type: 'varchar(20)', notNull: true, default: "'registered'" },
    registered_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addIndex('activities', ['status', 'start_time']);
  pgm.addIndex('activity_registrations', ['activity_id', 'alumni_id'], { unique: true });
};

exports.down = async (pgm) => {
  pgm.dropTable('activity_registrations');
  pgm.dropTable('activities');
};
