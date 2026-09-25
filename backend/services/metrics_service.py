"""Business impact calculations — expanded in Phase 5."""

from models.schemas import (
    BusinessImpactRead,
    BusinessMetricAssumptions,
    BusinessMetricSnapshot,
)


def default_impact(process_id: str | None = None) -> BusinessImpactRead:
    assumptions = BusinessMetricAssumptions()
    before = BusinessMetricSnapshot(
        label="Before (simulated)",
        processing_time_hours=18.5,
        manual_steps=17,
        human_handoffs=9,
        labor_hours=18.5,
        estimated_cost_usd=18.5 * assumptions.hourly_labor_cost_usd,
        error_opportunities=6,
    )
    after = BusinessMetricSnapshot(
        label="After (simulated)",
        processing_time_hours=6.2,
        manual_steps=7,
        human_handoffs=4,
        labor_hours=6.2,
        estimated_cost_usd=6.2 * assumptions.hourly_labor_cost_usd,
        error_opportunities=2,
        ai_assisted_steps=5,
        automated_steps=4,
        human_approval_steps=3,
    )
    return BusinessImpactRead(
        process_id=process_id,
        simulated=True,
        assumptions=assumptions,
        before=before,
        after=after,
        time_saved_hours=before.processing_time_hours - after.processing_time_hours,
        cost_saved_usd=before.estimated_cost_usd - after.estimated_cost_usd,
    )
