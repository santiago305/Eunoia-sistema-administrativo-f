import { describe, expect, it } from 'vitest';
import { RoutesPaths } from '@/routes/config/routesPaths';
import { getRouteMetaByPath } from '@/routes/config/routesConfig';
import { canAccessRoute } from '@/routes/config/routeAccess';

describe('mail routing and permissions regression', () => {
  it('keeps mail base route protected only by authentication', () => {
    const meta = getRouteMetaByPath(RoutesPaths.notifications);
    expect(meta).toBeTruthy();
    expect(canAccessRoute(meta, null, [])).toBe(true);
  });

  it('uses /email as canonical notifications path', () => {
    expect(RoutesPaths.notifications).toBe('/email');
  });
});
