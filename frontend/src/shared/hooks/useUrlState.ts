import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

export interface PageParams {
  page: number;
  size: number;
  sort?: string;
}

export function useUrlState(defaultParams: PageParams = { page: 0, size: 10 }): {
  params: PageParams;
  setParams: (newParams: Partial<PageParams>) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => {
    const pageAttr = searchParams.get('page');
    const sizeAttr = searchParams.get('size');
    const sortAttr = searchParams.get('sort');

    const page = pageAttr !== null ? Math.max(0, parseInt(pageAttr, 10) || 0) : defaultParams.page;
    const size = sizeAttr !== null ? Math.max(1, parseInt(sizeAttr, 10) || defaultParams.size) : defaultParams.size;
    const sort = sortAttr ?? defaultParams.sort;

    return { page, size, sort };
  }, [searchParams, defaultParams.page, defaultParams.size, defaultParams.sort]);

  const setParams = (newParams: Partial<PageParams>) => {
    const updated = new URLSearchParams(searchParams);
    if (newParams.page !== undefined) updated.set('page', newParams.page.toString());
    if (newParams.size !== undefined) updated.set('size', newParams.size.toString());
    if (newParams.sort !== undefined) {
      if (newParams.sort) updated.set('sort', newParams.sort);
      else updated.delete('sort');
    }
    setSearchParams(updated);
  };

  return { params, setParams };
}