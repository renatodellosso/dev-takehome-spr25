# Checklist

<!-- Make sure you fill out this checklist with what you've done before submitting! -->

- [x] Read the README [please please please]
- [x] Something cool!
- [x] Back-end
  - [x] Minimum Requirements
    - [x] Setup MongoDB database
    - [x] Setup item requests collection
    - [x] `PUT /api/request`
    - [x] `GET /api/request?page=_`
  - [x] Main Requirements
    - [x] `GET /api/request?status=pending`
    - [x] `PATCH /api/request`
  - [x] Above and Beyond
    - [x] Batch edits
    - [x] Batch deletes
- [ ] Front-end
  - [ ] Minimum Requirements
    - [ ] Dropdown component
    - [ ] Table component
    - [ ] Base page [table with data]
    - [ ] Table dropdown interactivity
  - [ ] Main Requirements
    - [ ] Pagination
    - [ ] Tabs
  - [ ] Above and Beyond
    - [ ] Batch edits
    - [ ] Batch deletes

# Notes

- You can check the DB connection with the `GET /api/status/` endpoint.
- Run tests with `npm run test`. Tests are in the `test` directory, which mirrors the `src` directory structure (`src/a/b.ts` is tested by `test/a/b.test.ts`). Describe blocks use `.name` so that functions can be renamed easily.
- Running `npm run test` might take a minute the first time; it has to download a MongoDB binary for the in-memory MongoDB server that tests use. I don't love this, but I didn't find a better way to test API routes. I tried mocking the mongo.ts module, but Jest had trouble with transforming the `bson` module.
- There's no clean separation between unit and integration tests here. The API tests are effectively integration tests, but the other tests are unit tests. If I had more time, I'd rather have unit tests and full end-to-end tests with something like Playwright, and have a clean division between the two. Irrespective of workload, integration tests that test only certain parts of the stack are lower on my priority list than E2E and unit tests. I think there is value in testing the integration between units, but I suspect E2E tests would catch most of the issues that integration tests would also catch, and unit tests would provide the most utility for isolating the causes of bugs. Though, if I'm really minimal on tests, but am willing to spend more effort on setup, I'd just have E2E tests since the mocking for true unit tests can be tedious. Since I've only done the back-end, I don't see value in E2E tests since Jest can test the API just fine.
- Dates are saved as ISO strings to avoid problems with Mongo saving dates as strings. I'm not 100% sure how I feel about this choice.
- API routes are not wrapped in try/catch blocks, since Next.js automatically returns a 500 Internal Server Error for uncaught exceptions.
- PUT /api/request returns a JSON object, like so:

```json
{
  "message": "Request created successfully.",
  "request": {
    "id": "unique_request_id",
    "requestorName": "Jane Doe",
    "itemName": "Sample Item",
    "status": "pending",
    "creationDate": "2023-10-01T12:00:00Z",
    "lastEditDate": "2023-10-01T12:00:00Z"
  }
}
```

**PATCH /api/request/batch**<br>
Takes an `ids` array and a `status` string in the request body.

Returns 400 Bad Request if `ids` is not an array or `status` is not a valid Request Status. Individual updates can be invalid

Returns 500 Internal Server Error if the database update fails. I'd like to add a check for if the find fails, but I haven't found a way yet.

Returns 200 OK if input is valid, even if no updates were made. Response structure:

```json
{
  "message": "Requests updated successfully.",
  "invalidIds": ["invalid_id_1", "invalid_id_2"],
  "successfulUpdateCount": 3
}
```

IDs are considered invalid if they are not valid ObjectId strings or if they do not correspond to existing requests in the database.

This route performs a find operation to check if the IDs exist before attempting to update them,
so it can report non-existent IDs. I consider being able to detect non-existent IDs worth the extra database query.

I originally had this method take an array of updates, where each update has an `id` and a `status` field, but I found that it was more convenient to just take an array of IDs and a single status string. That way, I can return 500 Internal Server Error if the update fails for any reason.

**DELETE /api/request/batch**<br>
Takes an array of IDs to delete. Returns 400 Bad Request if the input is not an array.

If the database delete fails, returns a 500 Internal Server Error.

Returns 200 OK if input is valid, even if no requests were deleted. Response structure:

```json
{
  "message": "Requests deleted successfully.",
  "invalidIds": ["invalid_id_1", "invalid_id_2"],
  "successfulDeleteCount": 3
}
```
