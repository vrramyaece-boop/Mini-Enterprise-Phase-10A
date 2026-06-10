
export const sanitizeInput = (value) => {
  return value.replace(/<script>|<\/script>|\{|\}/g, "").trim();
};

export const hasPermission = (user, roles=[]) => {
  if (!user) return false;
  return roles.includes(user.role);
};
