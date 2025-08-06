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
- Run tests with `npm run test`. Tests are in the `test` directory, which mirrors the `src` directory structure (`src/a/b.ts` is tested by `test/a/b.test.ts`).
