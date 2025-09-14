# BAU Weekly Review Feature

This document describes the BAU Weekly Review feature implementation.

## Overview

The BAU Weekly Review feature allows internal users to conduct systematic weekly reviews of all BAU customers, tracking their health status and key performance indicators.

## Routes

- `/app/bau/weekly-review` - Main weekly review interface

## How Weeks are Derived

Weeks are derived from the `bau_weekly_metrics` table:
- Query: `SELECT DISTINCT date_from, date_to FROM bau_weekly_metrics ORDER BY date_to DESC`
- Each unique `[date_from, date_to]` pair represents a week window
- Default selection is the latest available week (highest `date_to`)
- Earliest selectable week is determined by the minimum `date_from` in the data

## How to Create/Open Weekly Meeting

The "Create / Open Weekly Review Meeting" button:
1. Calls `createOrOpenWeeklyMeeting(weekFrom, weekTo)` function
2. Creates a meeting titled "BAU Weekly Review — Week of {weekFrom}"
3. Schedules for the day after week end at 9:00 AM
4. If a meeting already exists for that week, it opens the existing one
5. Future integration: This can be connected to your existing meeting system

## How Health/Escalation Persist

Weekly reviews are saved using:
- Function: `set_bau_weekly_review(p_bau_customer_id, p_date_from, p_date_to, p_health, p_escalation)`
- Table: `bau_weekly_reviews`
- Health values: 'green' or 'red'
- Escalation: Optional text field for notes/concerns
- Optimistic updates with server revalidation for immediate UI feedback

## Data Flow

1. **Week Selection**: Loads available weeks from metrics data
2. **Customer List**: Fetches BAU customers with health status for selected week
3. **KPI Display**: Shows customer metrics for the specific week
4. **Health Tracking**: Allows setting green/red status with optional escalation notes
5. **Trend Analysis**: 8-week historical view for any numeric KPI

## Components

### WeekSelector
- Dropdown to select review week
- Sources data from `bau_weekly_metrics` table
- Defaults to latest available week

### CustomerNavigator  
- Left panel with searchable customer list
- Shows health status badges (Green/Red/Unset)
- Filters customers by name/site/company

### CustomerReviewPanel
- Right panel showing customer details
- KPI cards with trend analysis
- Health selector (Green/Red toggle)
- Escalation notes textarea
- Save & Next functionality

### TrendDrawer
- Side drawer with 8-week trend charts
- Uses Recharts for line chart visualization
- Shows historical performance for any numeric KPI

## Key Features

- **Systematic Review**: Step through all BAU customers for a given week
- **KPI Visualization**: Auto-generated cards from weekly metrics data
- **Health Tracking**: Simple Green/Red health assessment
- **Trend Analysis**: Historical performance viewing
- **Meeting Integration**: Create weekly review meetings
- **Progress Tracking**: Summary of reviewed vs unreviewed customers

## Performance Optimizations

- React Query for caching and data management
- Lazy loading of trend charts
- Optimistic updates for health status changes
- Stale time settings to reduce unnecessary API calls

## Access Control

- Visible to internal users only (controlled by existing RLS policies)
- External users restricted to their company's BAU data (if enabled)
- Meeting creation limited to internal users

## Future Enhancements

- Integration with existing Actions and Meeting modals
- CSV export functionality for weekly summaries
- Bulk health status updates
- Email notifications for red-flagged customers
- Dashboard widgets for weekly review status