# Gherkin specification derived from the Playwright suite in tests/todo/.
# Scope: the TodoMVC application at /todo. The Cypress kitchen-sink demo pages
# are intentionally excluded, as documented in TEST_APPROACH.md.

Feature: Manage todo items
  As a todo application user
  I want to create, manage, filter, edit, and retain todo items
  So that my task list always reflects my actions

  Background:
    Given the TodoMVC todo page is open with an empty todo list
    And the browser storage is isolated for the scenario

  @add @ADD-001
  Scenario: Add a single todo item
    When I enter "Buy groceries" in the new todo input
    And I press Enter
    Then the todo list contains 1 item
    And todo item 1 has the text "Buy groceries"
    And the item counter shows "1 item left"

  @add @ADD-002
  Scenario: Add multiple todo items
    When I add the following todos in order:
      | text         |
      | Buy groceries|
      | Walk the dog  |
      | Read a book  |
    Then the todo list contains 3 items
    And todo item 1 has the text "Buy groceries"
    And todo item 2 has the text "Walk the dog"
    And todo item 3 has the text "Read a book"
    And the item counter shows "3 items left"

  @add @ADD-003
  Scenario: Reject an empty todo submitted with Enter
    When I leave the new todo input blank
    And I press Enter
    Then the todo list contains 0 items
    And the todo footer is hidden

  @add @ADD-004
  Scenario: Reject a whitespace-only todo
    When I enter "   " in the new todo input
    And I press Enter
    Then the todo list contains 0 items

  @add @ADD-005
  Scenario: Trim surrounding whitespace from a new todo
    When I enter "  Buy milk  " in the new todo input
    And I press Enter
    Then the todo list contains 1 item
    And todo item 1 has the text "Buy milk"

  @add @ADD-006
  Scenario: Render special characters as plain todo text
    When I enter "Buy <milk> & \"bread\" for $5" in the new todo input
    And I press Enter
    Then the todo list contains 1 item
    And todo item 1 has the text "Buy <milk> & \"bread\" for $5"
    And the text is rendered as plain text rather than interpreted as markup

  @add @ADD-007
  Scenario: Clear the new todo input after adding a todo
    When I enter "Learn Playwright" in the new todo input
    And I press Enter
    Then the new todo input is empty

  @complete @COMP-001
  Scenario: Mark a todo as complete using its checkbox
    Given I add the todo "Write tests"
    When I click the checkbox for todo item 1
    Then todo item 1 is marked completed
    And the item counter shows "0 items left"

  @complete @COMP-002
  Scenario: Unmark a completed todo as active
    Given I add the todo "Write tests"
    And I mark todo item 1 as completed
    When I click the checkbox for todo item 1
    Then todo item 1 is not marked completed
    And the item counter shows "1 item left"

  @complete @COMP-003
  Scenario: Update the item counter when todos are completed
    Given I add the following todos in order:
      | text   |
      | Task A |
      | Task B |
      | Task C |
    When I mark todo item 1 as completed
    And I mark todo item 2 as completed
    Then the item counter shows "1 item left"

  @complete @COMP-004
  Scenario: Visually distinguish completed and active todos
    Given I add the following todos in order:
      | text          |
      | Done task     |
      | Pending task  |
    When I mark todo item 1 as completed
    Then todo item 1 is marked completed
    And todo item 2 is not marked completed

  @complete @COMP-005
  Scenario: Show zero items left when all todos are completed
    Given I add the following todos in order:
      | text   |
      | Task 1 |
      | Task 2 |
    When I mark todo item 1 as completed
    And I mark todo item 2 as completed
    Then the item counter shows "0 items left"

  @delete @DEL-001
  Scenario: Delete a todo with its destroy button
    Given I add the todo "Temporary task"
    When I hover over todo item 1
    And I click its destroy button
    Then the todo list contains 0 items
    And the todo footer is hidden

  @delete @DEL-002
  Scenario: Delete one todo from a list of many
    Given I add the following todos in order:
      | text   |
      | Task A |
      | Task B |
      | Task C |
    When I hover over todo item 2
    And I click its destroy button
    Then the todo list contains 2 items
    And todo item 1 has the text "Task A"
    And todo item 2 has the text "Task C"

  @delete @DEL-003
  Scenario: Delete a completed todo
    Given I add the todo "Completed task"
    And I mark todo item 1 as completed
    When I hover over todo item 1
    And I click its destroy button
    Then the todo list contains 0 items

  @delete @DEL-004
  Scenario: Show the destroy button only while hovering over a todo
    Given I add the todo "Hover me"
    Then todo item 1's destroy button is not visible
    When I hover over todo item 1
    Then todo item 1's destroy button is visible

  @delete @DEL-005
  Scenario: Delete all todos one by one
    Given I add the following todos in order:
      | text   |
      | First  |
      | Second |
    When I hover over todo item 1
    And I click its destroy button
    Then the todo list contains 1 item
    When I hover over todo item 1
    And I click its destroy button
    Then the todo list contains 0 items
    And the todo footer is hidden

  @edit @EDIT-001
  Scenario: Enter edit mode by double-clicking a todo label
    Given I add the todo "Original text"
    When I double-click the label for todo item 1
    Then todo item 1 is in editing mode
    And its edit input is visible
    And its edit input contains "Original text"

  @edit @EDIT-002
  Scenario: Save edited text with Enter
    Given I add the todo "Original text"
    When I double-click the label for todo item 1
    And I replace the edit input value with "Updated text"
    And I press Enter in the edit input
    Then todo item 1 has the text "Updated text"
    And todo item 1 is not in editing mode

  @edit @EDIT-003
  Scenario: Save edited text when the edit input loses focus
    Given I add the todo "Original text"
    When I double-click the label for todo item 1
    And I replace the edit input value with "Saved by blur"
    And I move focus away from the edit input
    Then todo item 1 has the text "Saved by blur"

  @edit @EDIT-004
  Scenario: Cancel an edit with Escape
    Given I add the todo "Original text"
    When I double-click the label for todo item 1
    And I replace the edit input value with "This should be discarded"
    And I press Escape in the edit input
    Then todo item 1 has the text "Original text"
    And todo item 1 is not in editing mode

  @edit @EDIT-005
  Scenario: Delete a todo when its edited text is cleared and submitted
    Given I add the following todos in order:
      | text      |
      | Keep me   |
      | Delete me |
    When I double-click the label for todo item 2
    And I clear the edit input
    And I press Enter in the edit input
    Then the todo list contains 1 item
    And todo item 1 has the text "Keep me"

  @edit @EDIT-006
  Scenario: Trim whitespace when saving an edited todo
    Given I add the todo "Original"
    When I double-click the label for todo item 1
    And I replace the edit input value with "  Updated  "
    And I press Enter in the edit input
    Then todo item 1 has the text "Updated"

  @filter @FILTER-001
  Scenario: Show all todos with the All filter
    Given I add the following todos in order:
      | text           |
      | Active task    |
      | Completed task |
    And I mark todo item 2 as completed
    When I select the Active filter
    And I select the All filter
    Then the todo list contains 2 items
    And the All filter is selected

  @filter @FILTER-002
  Scenario: Show only active todos with the Active filter
    Given I add the following todos in order:
      | text      |
      | Active 1  |
      | Active 2  |
      | Completed |
    And I mark todo item 3 as completed
    When I select the Active filter
    Then the todo list contains 2 items
    And todo item 1 has the text "Active 1"
    And todo item 2 has the text "Active 2"
    And the Active filter is selected

  @filter @FILTER-003
  Scenario: Show only completed todos with the Completed filter
    Given I add the following todos in order:
      | text   |
      | Done 1 |
      | Done 2 |
      | Active |
    And I mark todo item 1 as completed
    And I mark todo item 2 as completed
    When I select the Completed filter
    Then the todo list contains 2 items
    And todo item 1 has the text "Done 1"
    And todo item 2 has the text "Done 2"
    And the Completed filter is selected

  @filter @FILTER-004
  Scenario: Update the Active view immediately when a visible todo is completed
    Given I add the following todos in order:
      | text   |
      | Task A |
      | Task B |
    When I select the Active filter
    And I mark the visible todo item 1 as completed
    Then the todo list contains 1 item
    And todo item 1 has the text "Task B"

  @filter @FILTER-005
  Scenario: Reflect the selected filter in the URL hash
    Given I add the todo "Sample"
    When I select the Active filter
    Then the URL ends with "#/active"
    When I select the Completed filter
    Then the URL ends with "#/completed"
    When I select the All filter
    Then the URL ends with "#/" or the todo page path

  @filter @FILTER-006
  Scenario: Show no todos in Active view when all todos are completed
    Given I add the following todos in order:
      | text   |
      | Task 1 |
      | Task 2 |
    And I mark todo item 1 as completed
    And I mark todo item 2 as completed
    When I select the Active filter
    Then the todo list contains 0 items

  @filter @FILTER-007
  Scenario: Show no todos in Completed view when none are completed
    Given I add the following todos in order:
      | text   |
      | Task 1 |
      | Task 2 |
    When I select the Completed filter
    Then the todo list contains 0 items

  @bulk @BULK-001
  Scenario: Mark all todos as completed with Toggle all
    Given I add the following todos in order:
      | text   |
      | Task 1 |
      | Task 2 |
      | Task 3 |
    When I click the Toggle all control
    Then todo item 1 is marked completed
    And todo item 2 is marked completed
    And todo item 3 is marked completed
    And the item counter shows "0 items left"

  @bulk @BULK-002
  Scenario: Unmark all todos when Toggle all is clicked while all are completed
    Given I add the following todos in order:
      | text   |
      | Task 1 |
      | Task 2 |
    And I click the Toggle all control
    When I click the Toggle all control again
    Then todo item 1 is not marked completed
    And todo item 2 is not marked completed
    And the item counter shows "2 items left"

  @bulk @BULK-003
  Scenario: Complete remaining active todos with Toggle all from a mixed state
    Given I add the following todos in order:
      | text   |
      | Task 1 |
      | Task 2 |
      | Task 3 |
    And I mark todo item 1 as completed
    When I click the Toggle all control
    Then todo item 1 is marked completed
    And todo item 2 is marked completed
    And todo item 3 is marked completed

  @bulk @BULK-004
  Scenario: Clear all completed todos and retain active todos
    Given I add the following todos in order:
      | text        |
      | Active task |
      | Done 1      |
      | Done 2      |
    And I mark todo item 2 as completed
    And I mark todo item 3 as completed
    When I click Clear completed
    Then the todo list contains 1 item
    And todo item 1 has the text "Active task"

  @bulk @BULK-005
  Scenario: Hide Clear completed when no todo is completed
    Given I add the following todos in order:
      | text     |
      | Active 1 |
      | Active 2 |
    Then the Clear completed button is not visible

  @bulk @BULK-006
  Scenario: Show Clear completed only while at least one todo is completed
    Given I add the todo "Task"
    Then the Clear completed button is not visible
    When I mark todo item 1 as completed
    Then the Clear completed button is visible
    When I click Clear completed
    Then the Clear completed button is not visible

  @bulk @BULK-007
  Scenario: Update the item counter after clearing completed todos
    Given I add the following todos in order:
      | text     |
      | Active 1 |
      | Active 2 |
      | Done 1   |
      | Done 2   |
    And I mark todo item 3 as completed
    And I mark todo item 4 as completed
    When I click Clear completed
    Then the item counter shows "2 items left"

  @persistence @PERSIST-001
  Scenario: Persist todos across a page reload
    Given I open a fresh todo page without clearing storage between actions
    And I add the following todos in order:
      | text   |
      | Task 1 |
      | Task 2 |
      | Task 3 |
    When I reload the page
    Then the todo list contains 3 items
    And todo item 1 has the text "Task 1"
    And todo item 2 has the text "Task 2"
    And todo item 3 has the text "Task 3"

  @persistence @PERSIST-002
  Scenario: Persist completed state across a page reload
    Given I open a fresh todo page without clearing storage between actions
    And I add the following todos in order:
      | text           |
      | Completed task |
      | Active task    |
    And I mark todo item 1 as completed
    When I reload the page
    Then todo item 1 is marked completed
    And todo item 2 is not marked completed
    And the item counter shows "1 item left"

  @persistence @PERSIST-003
  Scenario: Persist the Active filter selection across a page reload
    Given I open a fresh todo page without clearing storage between actions
    And I add the todo "Sample task"
    When I select the Active filter
    And I reload the page
    Then the Active filter is selected
