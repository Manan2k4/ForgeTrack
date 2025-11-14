# ForgeTrack ER Diagram

This entity-relationship diagram reflects the current MongoDB/Mongoose models used by the backend. It focuses on core entities and their relationships.

## Diagram

```mermaid
erDiagram
  USER ||--o{ WORK_LOG : "records"
  PRODUCT ||--o{ WORK_LOG : "used in"
  USER ||--o{ TRANSPORTER_LOG : "records"

  USER {
    ObjectId _id PK
    string name
    string username UNIQ
    string password (hashed)
    enum role  "admin | employee"
    string contact  "required if role=employee"
    string address  "required if role=employee"
    enum department "Sleeve Workshop | Rod/Pin Workshop | Packing | Transporter"
    boolean isActive "soft-delete flag"
    datetime createdAt
    datetime updatedAt
  }

  PRODUCT {
    ObjectId _id PK
    enum type  "sleeve | rod | pin"
    string code  "required if type=sleeve; UNIQUE (partial)"
    string partName "required if type in [rod, pin]; UNIQUE with type (partial, case-insensitive)"
    string[] sizes  "required (array of sizes)"
    datetime createdAt
    datetime updatedAt
  }

  WORK_LOG {
    ObjectId _id PK
    ObjectId employee FK "-> USER._id"
    enum jobType "rod | sleeve | pin"
    ObjectId product FK "-> PRODUCT._id"
    string partSize
    string operation "optional e.g., CASTING, BORE"
    number quantity  "deprecated; use totalParts"
    number totalParts
    number rejection  "default 0, >= 0"
    string employeeName "snapshot for display"
    string employeeDepartment "snapshot for display"
    date date  "defaults to now"
    string workDate  "YYYY-MM-DD"
    datetime createdAt
    datetime updatedAt
  }

  TRANSPORTER_LOG {
    ObjectId _id PK
    ObjectId employee FK "-> USER._id"
    enum jobType "outside-rod | outside-pin"
    string partyName
    number totalParts
    number rejection  "default 0, >= 0"
    string workDate  "YYYY-MM-DD"
    string employeeName "snapshot for display"
    string employeeDepartment "snapshot for display"
    datetime createdAt
    datetime updatedAt
  }
```

## Relationships
- User to WorkLog: One user (employee) can have many work logs; each work log references exactly one user.
- Product to WorkLog: One product can appear in many work logs; each work log references exactly one product.
- User to TransporterLog: One user (employee) can have many transporter logs; each transporter log references exactly one user.

## Constraints and Indexes
- User
  - username: unique
  - Password is stored hashed (bcrypt); excluded from JSON via toJSON method.
  - contact, address, department: required only when role = employee.
- Product
  - type in {sleeve, rod, pin}
  - Unique indexes:
    - code: unique when type = sleeve (partial index)
    - (partName, type): unique when type in {rod, pin} (partial + collation for case-insensitive partName)
- WorkLog
  - employee: ref User (required)
  - product: ref Product (required)
  - jobType in {rod, sleeve, pin}
  - Indexes: {employee, workDate}, {jobType, workDate}, {workDate}
- TransporterLog
  - employee: ref User (required)
  - jobType in {outside-rod, outside-pin}
  - Indexes: {workDate}, {employee, workDate}, {partyName, workDate}

## Notes
- WorkLog and TransporterLog duplicate employeeName and employeeDepartment to preserve display context even if the user is later deactivated or deleted.
- `isActive` on User is a soft-delete flag to retain historical logs. Historical logs should not be removed when user is deactivated.
- Dates
  - `date` is a Date (full timestamp) defaulting to now.
  - `workDate` is stored as YYYY-MM-DD string for easier filtering.

## Potential Extensions
- Link TransporterLog to Product if needed to track parts at a product level.
- Add Company/Party as a separate entity and reference it from TransporterLog instead of a free-form `partyName`.
- Normalize operations into a collection if operation metadata grows (e.g., standard durations or rates per operation).
