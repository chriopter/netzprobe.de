import { dataPackageIds } from './dataPackages';

export const datasetIds = dataPackageIds;

export const dataWikiHomeUrl = () => `${import.meta.env.BASE_URL}wiki/`;
export const dataWikiUrl = (id: string) => `${import.meta.env.BASE_URL}wiki/${encodeURIComponent(id)}`;
