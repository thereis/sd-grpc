export const chunker = (arr, len) => {
  var chunks = [],
    i = 0,
    n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)));
  }

  return chunks;
};

export const convertToDouble = array => {
  return array.map(item => {
    return parseFloat(item);
  });
};
