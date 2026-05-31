"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadProductCatalog,
  PRODUCTS_CACHE_CHANGE_EVENT,
} from "@/lib/firebase-data";
import type { Product } from "@/lib/types";

export function useProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProducts = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);

    try {
      const nextProducts = await loadProductCatalog(forceRefresh);
      setProducts(nextProducts);

      return nextProducts;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const hydrateProducts = async () => {
      try {
        const nextProducts = await loadProductCatalog();

        if (!isActive) {
          return;
        }

        setProducts(nextProducts);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void hydrateProducts();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleCatalogChange = async () => {
      const nextProducts = await loadProductCatalog();
      setProducts(nextProducts);
    };

    window.addEventListener(PRODUCTS_CACHE_CHANGE_EVENT, handleCatalogChange);

    return () => {
      window.removeEventListener(
        PRODUCTS_CACHE_CHANGE_EVENT,
        handleCatalogChange
      );
    };
  }, []);

  return {
    products,
    isLoading,
    refreshProducts,
    setProducts,
  };
}