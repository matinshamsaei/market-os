const isObjectEmpty = (obj: Record<string, any>) => {
  return Object.keys(obj).length === 0;
};

export default isObjectEmpty;
