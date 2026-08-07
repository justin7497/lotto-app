export function numberLineStats(numbers: number[]) {
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  const odd = numbers.filter((n) => n % 2 === 1).length;
  return {
    sum,
    odd,
    even: numbers.length - odd,
  };
}
