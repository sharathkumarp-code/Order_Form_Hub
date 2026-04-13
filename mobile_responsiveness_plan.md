# Implementation Plan - Mobile Responsiveness for Select Items

This plan addresses UI crowding and truncation issues on mobile devices within the "Select Items" section of the public order form.

## User Review Required

> [!IMPORTANT]
> To ensure all item names are readable, I will remove the text truncation for item names on mobile. This might cause some cards to grow taller, which is a better trade-off for usability.

## Proposed Changes

### [Frontend] Public Order Form

#### [MODIFY] [order-form.tsx](file:///c:/Users/Sharathkumar/WorkArea/Order_Form/Order-Form-Hub/artifacts/order-app/src/pages/public/order-form.tsx)

- **Section Container**:
  - Reduce padding from `p-6 sm:p-8` to `p-4 sm:p-8` to save horizontal space on mobile.
- **Group Header**:
  - Update layout to `flex-col sm:flex-row` and `items-start sm:items-center`.
  - Add spacing between the group name and the pickup badge (`gap-2 sm:gap-4`).
- **Item Card**:
  - Change main layout to `flex-col sm:flex-row` and `items-stretch sm:items-center`.
  - On mobile (`sm` and below):
    - Name and Category will be on top.
    - Price and Stepper will be on a second row, justified to the edges.
  - Remove `truncate` from the item name to prevent "..." on long names.
- **Floating Footer**:
  - Adjust padding and font sizes for the "Total" display on very small screens.

## Verification Plan

### Automated Tests
- I'll use the browser subagent to capture screenshots at 320px and 375px widths after the changes.

### Manual Verification
1.  **Mobile View**: Verify that long item names (like "Chettinad Chicken Gravy") wrap onto multiple lines and are fully readable.
2.  **Badge Layout**: Ensure the "Pickup" badge doesn't overlap with the group name.
3.  **Stepper Control**: Ensure the +/- buttons are large enough to be easily tapped on a mobile screen.
