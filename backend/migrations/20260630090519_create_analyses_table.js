exports.up = function(knex) {
  return knex.schema.createTable('analyses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('resume_id').notNullable()
      .references('id').inTable('resumes').onDelete('CASCADE');
    table.text('raw_text');
    table.jsonb('skills');
    table.integer('experience_years');
    table.float('score');
    table.jsonb('feedback');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('resume_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('analyses');
};