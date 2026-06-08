const isActiveNav = (basePath: string, itemPath: string, pathname: string) => {
  if (pathname === itemPath) return true;
  if (itemPath === basePath) return false;
  return pathname.startsWith(`${itemPath}/`);
};

export default isActiveNav;
