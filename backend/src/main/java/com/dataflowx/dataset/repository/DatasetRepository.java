package com.dataflowx.dataset.repository;

import com.dataflowx.auth.entity.User;
import com.dataflowx.dataset.entity.Dataset;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatasetRepository extends JpaRepository<Dataset, Long> {

    Page<Dataset> findByOwner(User owner, Pageable pageable);
}
