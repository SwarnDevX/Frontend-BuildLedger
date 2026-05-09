import { useState } from "react";
import { createUser, updateUser } from "../api/users";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  status: "ACTIVE",
  role: "PROJECT_MANAGER",
};

const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const STRONG_PASSWORD_MSG =
  "Password must contain at least one uppercase, one lowercase, one number and one special character (@$!%*?&)";

export function useUserForm(editUser, fetchUsers, setShowCreate) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset form for create
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormErr({});
  };

  // Populate form for edit
  const populateForm = (u) => {
    setForm({
      name: u.name || "",
      username: u.username || "",
      email: u.email || "",
      phone: u.phone || "",
      password: "",
      status: u.status || "ACTIVE",
      role: u.role,
    });
    setFormErr({});
  };

  // Single field validation — used by onBlur
  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "name":
        if (!value.trim()) error = "Name is required";
        else if (value.trim().length < 2 || value.trim().length > 100)
          error = "Name must be between 2 and 100 characters";
        else if (!/^[a-zA-Z\s]+$/.test(value.trim()))
          error = "Name must contain only alphabets";
        break;
      case "username":
        if (!value.trim()) error = "Username is required";
        else if (value.trim().length < 4 || value.trim().length > 50)
          error = "Username must be between 4 and 50 characters";
        else if (!/^[a-zA-Z0-9._]+$/.test(value.trim()))
          error = "Username can only contain letters, digits, dots and underscores";
        break;
      case "email":
        if (!value.trim()) error = "Email is required";
        else if (value.trim().length > 100)
          error = "Email cannot exceed 100 characters";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
          error = "Invalid email format";
        break;
      case "phone":
        if (value && !/^[6-9]\d{9}$/.test(value.trim()))
          error = "Phone number must be a valid 10-digit Indian number";
        break;
      case "password":
        if (!editUser) {
          if (!value) error = "Password is required";
          else if (value.length < 8 || value.length > 100)
            error = "Password must be between 8 and 100 characters";
          else if (!STRONG_PASSWORD_REGEX.test(value))
            error = STRONG_PASSWORD_MSG;
        } else if (value) {
          if (value.length < 8 || value.length > 100)
            error = "Password must be between 8 and 100 characters";
          else if (!STRONG_PASSWORD_REGEX.test(value))
            error = STRONG_PASSWORD_MSG;
        }
        break;
      default:
        break;
    }
    setFormErr((prev) => ({ ...prev, [name]: error }));
  };

  // Full form validation — used on submit
  const validate = () => {
    const e = {};

    if (!form.name.trim()) {
      e.name = "Name is required";
    } else if (form.name.trim().length < 2 || form.name.trim().length > 100) {
      e.name = "Name must be between 2 and 100 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(form.name.trim())) {
      e.name = "Name must contain only alphabets";
    }

    if (!form.username.trim()) {
      e.username = "Username is required";
    } else if (form.username.trim().length < 4 || form.username.trim().length > 50) {
      e.username = "Username must be between 4 and 50 characters";
    } else if (!/^[a-zA-Z0-9._]+$/.test(form.username.trim())) {
      e.username = "Username can only contain letters, digits, dots and underscores";
    }

    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (form.email.trim().length > 100) {
      e.email = "Email cannot exceed 100 characters";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Invalid email format";
    }

    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone.trim())) {
      e.phone = "Phone number must be a valid 10-digit Indian number";
    }

    if (!editUser) {
      if (!form.password) {
        e.password = "Password is required";
      } else if (form.password.length < 8 || form.password.length > 100) {
        e.password = "Password must be between 8 and 100 characters";
      } else if (!STRONG_PASSWORD_REGEX.test(form.password)) {
        e.password = STRONG_PASSWORD_MSG;
      }
    } else if (form.password) {
      if (form.password.length < 8 || form.password.length > 100) {
        e.password = "Password must be between 8 and 100 characters";
      } else if (!STRONG_PASSWORD_REGEX.test(form.password)) {
        e.password = STRONG_PASSWORD_MSG;
      }
    }

    setFormErr(e);
    return !Object.keys(e).length;
  };

  // onChange — updates field + clears its error instantly
 const set = (k) => (e) => {
  const value = e.target?.value ?? e;
  setForm((p) => ({ ...p, [k]: value }));
  validateField(k, value);  // ← validate on every keystroke
};
  // onBlur — validates single field when focus leaves
  const handleBlur = (k) => () => {
    validateField(k, form[k]);
  };

  // Save — create or update user
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editUser) {
        const payload = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          status: form.status || editUser.status || "ACTIVE",
        };
        if (form.password) payload.password = form.password;
        await updateUser(editUser.userId, payload);
        toast.success("User updated successfully");
      } else {
        await createUser({
          name: form.name,
          username: form.username,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          status: "ACTIVE",
        });
        toast.success("User created successfully");
      }
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setForm,
    formErr,
    setFormErr,
    saving,
    set,
    handleBlur,
    handleSave,
    resetForm,
    populateForm,
  };
}
