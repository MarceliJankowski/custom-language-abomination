/**@desc extract `unique` characters from string array and return them*/
export function getUniqueCharsFromStringArr(arr: string[]): string {
  const uniqueCharsSet = new Set();
  let uniqueCharsStr = "";

  // build uniqueCharsSet
  arr.forEach(string => string.split("").forEach(char => uniqueCharsSet.add(char)));

  // build uniqueCharsStr
  uniqueCharsSet.forEach(uniqueChar => (uniqueCharsStr += uniqueChar));

  return uniqueCharsStr;
}
