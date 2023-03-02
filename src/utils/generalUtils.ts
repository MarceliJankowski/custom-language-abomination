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

/**@desc escape `chars` from `inputStr` (escape with backslash), return modified `inputStr`
@parm inputStr string containing `chars` to escape
@param ...chars arguments that come after `inpuStr` are treated as characters to be escaped*/
export function escapeStringChars(inputStr: string, ...chars: string[]) {
  const regExp = new RegExp(`[${chars.join("")}]`, "g");
  const outputStr = inputStr.replace(regExp, match => `\\${match}`);

  return outputStr;
}
