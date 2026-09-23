package com.dataflowx.job.repository;

import com.dataflowx.job.entity.Job;
import com.dataflowx.job.entity.JobStatus;
import com.dataflowx.auth.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Long> {

    Page<Job> findByDatasetOwner(User owner, Pageable pageable);

    long countByStatus(JobStatus status);

    @EntityGraph(attributePaths = "dataset")
    Optional<Job> findWithDatasetById(Long id);
}
