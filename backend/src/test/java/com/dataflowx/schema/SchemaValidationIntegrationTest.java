package com.dataflowx.schema;

import com.dataflowx.test.AbstractIntegrationTest;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class SchemaValidationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void springBootContextLoadsAndHibernateValidatesFlywaySchema() {
        assertThat(flyway).isNotNull();
        assertThat(jdbcTemplate).isNotNull();

        // Verify Flyway executed V1 migration
        var currentMigration = flyway.info().current();
        assertThat(currentMigration).isNotNull();
        assertThat(currentMigration.getVersion().getVersion()).isEqualTo("1");
        assertThat(currentMigration.getDescription()).isEqualTo("initial schema");

        // Verify tables exist in PostgreSQL
        var tables = jdbcTemplate.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
                String.class
        );
        assertThat(tables).contains("users", "datasets", "jobs", "flyway_schema_history");

        // Verify foreign key constraints exist
        var foreignKeys = jdbcTemplate.queryForList(
                "SELECT constraint_name FROM information_schema.table_constraints " +
                "WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'",
                String.class
        );
        assertThat(foreignKeys).contains("fk_datasets_owner_id", "fk_jobs_dataset_id");

        // Verify check constraint on jobs progress
        var checkConstraints = jdbcTemplate.queryForList(
                "SELECT constraint_name FROM information_schema.table_constraints " +
                "WHERE constraint_type = 'CHECK' AND table_schema = 'public'",
                String.class
        );
        assertThat(checkConstraints).contains("chk_jobs_progress");

        // Verify unique constraint on users email
        var uniqueConstraints = jdbcTemplate.queryForList(
                "SELECT constraint_name FROM information_schema.table_constraints " +
                "WHERE constraint_type = 'UNIQUE' AND table_schema = 'public'",
                String.class
        );
        assertThat(uniqueConstraints).contains("uk_users_email");
    }
}
