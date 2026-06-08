const groupByWeek = <T extends { week_number: number }>(items: T[]) => {
  const grouped = new Map<number, T[]>();
  items.forEach((item) => {
    const key = item.week_number || 1;
    const list = grouped.get(key) || [];
    list.push(item);
    grouped.set(key, list);
  });
  return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
};

export default groupByWeek;
