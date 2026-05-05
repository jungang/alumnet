/**
 * 隐私握手表 + 校友自助服务相关迁移
 * @eslint
 * global exports, pgm
 */
/* eslint no-undef: "off" */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 隐私握手表
  pgm.createTable('privacy_handshakes', {
    id: 'id',
    requester_id: { type: 'uuid', notNull: true, references: 'alumni(id)', onDelete: 'CASCADE' },
    target_id: { type: 'uuid', notNull: true, references: 'alumni(id)', onDelete: 'CASCADE' },
    status: { type: 'varchar(20)', notNull: true, default: "'pending'" },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    responded_at: { type: 'timestamptz' },
  });

  // 索引
  pgm.addConstraint('privacy_handshakes', 'unique_requester_target', {
    unique: ['requester_id', 'target_id'],
  });

  pgm.addIndex('privacy_handshakes', ['requester_id']);
  pgm.addIndex('privacy_handshakes', ['target_id']);
};

exports.down = async (pgm) => {
  pgm.dropTable('privacy_handshakes');
};
