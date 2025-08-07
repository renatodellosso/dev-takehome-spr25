# Checklist

<!-- Make sure you fill out this checklist with what you've done before submitting! -->

- [x] Read the README [please please please]
- [x] Something cool!
- [ ] Back-end
  - [ ] Minimum Requirements
    - [x] Setup MongoDB database
    - [x] Setup item requests collection
    - [ ] `PUT /api/request`
    - [ ] `GET /api/request?page=_`
  - [ ] Main Requirements
    - [ ] `GET /api/request?status=pending`
    - [ ] `PATCH /api/request`
  - [ ] Above and Beyond
    - [ ] Batch edits
    - [ ] Batch deletes
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

<!-- Notes go here -->

- You can check DB connection with the `GET /api/status/` endpoint.
- Run tests with `npm run test`. Tests are in the `test` directory, which mirrors the `src` directory structure (`src/a/b.ts` is tested by `test/a/b.test.ts`). Describe blocks use `.name` so that functions can be renamed easily.
- Running `npm run test` might take a minute the first time; it has to download a MongoDB binary for the in-memory MongoDB server that tests use. I don't love this, but I didn't find a better way to test API routes.
- `npm run test` is set to run tests sequentially with the `-i` flag. There's only a single DB, so mutliple tests running in parallel would cause issues. If I was going to fix this problem, I'd have each test file use a different database name.
- Dates are saved as strings to avoid problems with Mongo saving dates as strings. I'm not 100% sure how I feel about this choice.

**PATCH /api/request/batch**
Takes an array of updates, where each update has an `id` and a `status` field.

Returns 400 Bad Request if the input is not an array. Individual updates can be invalid

Returns 200 OK if input is valid, even if no updates were made. Response structure:

```json
{
  "message": "Requests updated successfully.",
  "errors": [
    {
      "id": "invalid_id",
      "invalidFields": ["status"]
    },
    {
      "id": "another_invalid_id",
      "invalidFields": ["id", "status"]
    }
  ],
  "successfulUpdateCount": 5
}
```

Updates are sorted by status to take advantage of MongoDB's `updateMany` operation. Will update `lastEditDate` to the current date for each updated request.
