export function initials(name = "User") {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function money(value = 0) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}