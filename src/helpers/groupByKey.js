const groupByKey = (list, key, { omitKey = false }) =>
  list.reduce(
    (hash, { [key]: value, ...rest }) => ({
      ...hash,
      [value]: (hash[value] || []).concat(
        omitKey ? { ...rest } : { [key]: value, ...rest },
      ),
    }),
    {},
  );

export default groupByKey;
