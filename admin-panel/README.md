````markdown name=README.md
```markdown
# ForgeTrack — Admin Panel

Location: admin-panel/

Features:
- Admin login (admin/admin).
- Add employees (name, contact, address, username, password, department).
- Manage employees (delete, impersonate).
- Add products (Sleeve: code + sizes; Rod/Pin: part-name + sizes).
- Product lists with edit/delete.
- View logs submitted by employees (grouped by date).

Storage:
- All data saved in browser localStorage under keys:
  - ft_employees
  - ft_products
  - ft_logs
  - ft_currentUser

Open index.html in a browser to use. This is intentionally a client-side demo so you can test flows quickly.
```
````