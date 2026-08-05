import categories from "../data/categories.json";

export { categories };

export function getCategoryBySlug(slug:string){
  return categories.find(
    category => category.slug === slug
  );
}
