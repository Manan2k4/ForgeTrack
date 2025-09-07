````markdown name=README.md
```markdown
# ForgeTrack — Worker App

Location: worker-app/

Features:
- Employee login using credentials created by admin.
- Auto-login via localStorage (ft_currentUser).
- Three job buttons: Inside Job Rod, Inside Job Sleeve, Inside Job Pin.
- Dependent dropdowns:
  - Sleeve: first dropdown = code (from admin's product list). size dropdown depends on selected code.
  - Rod/Pin: first dropdown = part-name. size dropdown depends on part-name.
- Submit logs: saved in localStorage key ft_logs with date and employee info.
- Worker UI hides logs — only admin can view logs from admin-panel.

Open index.html in a browser to use.
```
````