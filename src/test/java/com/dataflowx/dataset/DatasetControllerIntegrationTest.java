package com.dataflowx.dataset;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.repository.UserRepository;
import com.dataflowx.dataset.entity.Dataset;
import com.dataflowx.dataset.entity.DatasetStatus;
import com.dataflowx.dataset.repository.DatasetRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DatasetControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DatasetRepository datasetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User alice;
    private User bob;
    private User admin;

    @BeforeEach
    void setUp() {
        datasetRepository.deleteAll();
        userRepository.deleteAll();

        alice = userRepository.save(new User(
                "alice",
                "alice@example.com",
                passwordEncoder.encode("alice-password"),
                UserRole.USER
        ));
        bob = userRepository.save(new User(
                "bob",
                "bob@example.com",
                passwordEncoder.encode("bob-password"),
                UserRole.USER
        ));
        admin = userRepository.save(new User(
                "admin",
                "admin@example.com",
                passwordEncoder.encode("admin-password"),
                UserRole.ADMIN
        ));
    }

    @Test
    void unauthenticatedRequestsReturnUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/datasets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("Genome Dataset", "Research data")))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/datasets"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/datasets/1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/v1/datasets/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson("Name", null, DatasetStatus.ACTIVE)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/v1/datasets/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void userCreatesDatasetWithOwnerDerivedFromAuthentication() throws Exception {
        String token = login("alice@example.com", "alice-password");

        MvcResult result = mockMvc.perform(post("/api/v1/datasets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("Genome Dataset", "Research data")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Genome Dataset"))
                .andExpect(jsonPath("$.description").value("Research data"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.ownerId").value(alice.getId()))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty())
                .andReturn();

        Long datasetId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        Dataset saved = datasetRepository.findById(datasetId).orElseThrow();
        assertThat(saved.getOwner().getId()).isEqualTo(alice.getId());
        assertThat(saved.getStatus()).isEqualTo(DatasetStatus.ACTIVE);
    }

    @Test
    void adminCreatesDatasetAndOwnerIsAdmin() throws Exception {
        String token = login("admin@example.com", "admin-password");

        mockMvc.perform(post("/api/v1/datasets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("Admin Dataset", null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerId").value(admin.getId()))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        assertThat(datasetRepository.count()).isEqualTo(1);
    }

    @Test
    void userCannotReadAnotherUsersDatasetById() throws Exception {
        Dataset bobs = datasetRepository.save(new Dataset("Bobs Dataset", "Owned by Bob", bob));

        String aliceToken = login("alice@example.com", "alice-password");

        mockMvc.perform(get("/api/v1/datasets/" + bobs.getId())
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void userCanReadOwnDatasetById() throws Exception {
        Dataset dataset = datasetRepository.save(new Dataset("Alices Dataset", "Desc", alice));

        String token = login("alice@example.com", "alice-password");

        mockMvc.perform(get("/api/v1/datasets/" + dataset.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(dataset.getId()))
                .andExpect(jsonPath("$.name").value("Alices Dataset"))
                .andExpect(jsonPath("$.ownerId").value(alice.getId()));
    }

    @Test
    void adminCanReadAnyUsersDataset() throws Exception {
        Dataset bobs = datasetRepository.save(new Dataset("Bobs Dataset", "Bob owns it", bob));

        String adminToken = login("admin@example.com", "admin-password");

        mockMvc.perform(get("/api/v1/datasets/" + bobs.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bobs.getId()))
                .andExpect(jsonPath("$.ownerId").value(bob.getId()));
    }

    @Test
    void nonexistentDatasetReturnsNotFound() throws Exception {
        String token = login("alice@example.com", "alice-password");

        mockMvc.perform(get("/api/v1/datasets/999999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void ownerCanUpdateDatasetOtherUserCannot() throws Exception {
        Dataset alices = datasetRepository.save(new Dataset("Original", "Old desc", alice));

        String aliceToken = login("alice@example.com", "alice-password");
        String bobToken = login("bob@example.com", "bob-password");

        mockMvc.perform(put("/api/v1/datasets/" + alices.getId())
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson("Should Not Work", "desc", DatasetStatus.ACTIVE)))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/datasets/" + alices.getId())
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson("Updated Name", "New desc", DatasetStatus.ARCHIVED)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"))
                .andExpect(jsonPath("$.description").value("New desc"))
                .andExpect(jsonPath("$.status").value("ARCHIVED"));

        Dataset updated = datasetRepository.findById(alices.getId()).orElseThrow();
        assertThat(updated.getName()).isEqualTo("Updated Name");
        assertThat(updated.getStatus()).isEqualTo(DatasetStatus.ARCHIVED);
    }

    @Test
    void adminCanUpdateAnyUsersDataset() throws Exception {
        Dataset bobs = datasetRepository.save(new Dataset("Original Name", "desc", bob));
        String adminToken = login("admin@example.com", "admin-password");

        mockMvc.perform(put("/api/v1/datasets/" + bobs.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson("Admin Updated", "Admin desc", DatasetStatus.ARCHIVED)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Admin Updated"))
                .andExpect(jsonPath("$.ownerId").value(bob.getId()));
    }

    @Test
    void updateWithBlankNameReturnsValidationError() throws Exception {
        Dataset alices = datasetRepository.save(new Dataset("Valid", "desc", alice));
        String token = login("alice@example.com", "alice-password");

        mockMvc.perform(put("/api/v1/datasets/" + alices.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"   ","description":"ok"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    void ownerCanDeleteDatasetOtherUserCannotAdminCanDeleteAny() throws Exception {
        Dataset alices = datasetRepository.save(new Dataset("Alice's", "d", alice));
        Dataset bobs = datasetRepository.save(new Dataset("Bob's", "d", bob));

        String aliceToken = login("alice@example.com", "alice-password");
        String bobToken = login("bob@example.com", "bob-password");
        String adminToken = login("admin@example.com", "admin-password");

        mockMvc.perform(delete("/api/v1/datasets/" + alices.getId())
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/v1/datasets/" + alices.getId())
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNoContent());

        assertThat(datasetRepository.findById(alices.getId())).isEmpty();

        mockMvc.perform(delete("/api/v1/datasets/" + bobs.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(datasetRepository.findById(bobs.getId())).isEmpty();
    }

    @Test
    void listEndpointReturnsAuthorizedDatasetsWithPagination() throws Exception {
        for (int i = 0; i < 3; i++) {
            datasetRepository.save(new Dataset("Alice " + i, null, alice));
        }
        datasetRepository.save(new Dataset("Bob 0", null, bob));

        String aliceToken = login("alice@example.com", "alice-password");
        String bobToken = login("bob@example.com", "bob-password");
        String adminToken = login("admin@example.com", "admin-password");

        mockMvc.perform(get("/api/v1/datasets?page=0&size=2")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(2));

        mockMvc.perform(get("/api/v1/datasets?page=1&size=2")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));

        MvcResult bobList = mockMvc.perform(get("/api/v1/datasets")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andReturn();
        assertThat(bobList.getResponse().getContentAsString()).doesNotContain("Alice");

        mockMvc.perform(get("/api/v1/datasets")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(4));
    }

    @Test
    void createDatasetWithBlankNameReturnsValidationError() throws Exception {
        String token = login("alice@example.com", "alice-password");

        mockMvc.perform(post("/api/v1/datasets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"ok"}
                                """))
                .andExpect(status().isBadRequest());
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("token").asText();
    }

    private String createJson(String name, String description) {
        return """
                {"name":"%s","description":%s}
                """.formatted(name, description == null ? "null" : "\"" + description + "\"");
    }

    private String updateJson(String name, String description, DatasetStatus status) {
        String descJson = description == null ? "null" : "\"" + description + "\"";
        String statusJson = status == null ? "null" : "\"" + status.name() + "\"";
        return """
                {"name":"%s","description":%s,"status":%s}
                """.formatted(name, descJson, statusJson);
    }

    private String loginJson(String email, String password) {
        return """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
    }
}
