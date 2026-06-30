exports.up = function(knex) {
  return knex.schema.createTable('resumes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('s3_key', 500).notNullable();
    table.string('filename', 255).notNullable();
    table.string('status', 20).notNullable().defaultTo('uploaded');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('status');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('resumes');
};