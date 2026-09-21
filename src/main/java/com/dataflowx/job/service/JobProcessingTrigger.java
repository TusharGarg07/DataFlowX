package com.dataflowx.job.service;

import com.dataflowx.job.event.JobSubmittedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class JobProcessingTrigger {

    private final JobProcessor jobProcessor;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void trigger(JobSubmittedEvent event) {
        jobProcessor.process(event.jobId());
    }
}
