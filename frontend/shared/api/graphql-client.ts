import { GraphQLClient } from "graphql-request";

export const graphqlClient = new GraphQLClient(
  "https://graphql.anilist.co",
  {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  }
);