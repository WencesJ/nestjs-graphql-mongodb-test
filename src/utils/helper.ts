import { Document } from 'mongoose';

export const mongooseSchemaRemoveProps =
  ({ props, _id } = { props: [], _id: true }) =>
  (_: Document, ret: Document) => {
    if (Array.isArray(props)) {
      props.forEach((prop) => delete ret[prop]);
    }

    if (_id) delete ret._id;

    return ret;
  };
