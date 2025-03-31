type SortDirection = 1 | -1;
type SortField<T> = keyof T;

export const createSorter = <T extends object>(
  field: SortField<T>,
  direction: SortDirection = 1,
) => {
  return (a: T, b: T) => {
    const valueA = a[field];
    const valueB = b[field];

    // Handle number sorting
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return direction * (valueA - valueB);
    }

    // Handle string sorting
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return direction * valueA.localeCompare(valueB);
    }

    // Handle date sorting
    if (valueA instanceof Date && valueB instanceof Date) {
      return direction * (valueA.getTime() - valueB.getTime());
    }

    return 0;
  };
};

// Example usage:
// const users = [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }];
// users.sort(createSorter('age', -1)); // Sort by age in descending order
// users.sort(createSorter('name')); // Sort by name in ascending order
