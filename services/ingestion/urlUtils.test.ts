import { describe, it, expect } from '@jest/globals';
import { normalizeUrl } from './urlUtils';

describe('normalizeUrl', () => {
  it('should add a trailing slash to a URL without one', () => {
    expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path/');
  });

  it('should not add a trailing slash if one already exists', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path/');
  });
  
  it('should not add a trailing slash to the root path', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('should convert the hostname to lowercase', () => {
    expect(normalizeUrl('https://EXAMPLE.COM/path')).toBe('https://example.com/path/');
  });

  it('should strip a single UTM parameter', () => {
    expect(normalizeUrl('https://example.com/path?utm_source=google')).toBe('https://example.com/path/');
  });

  it('should strip multiple UTM parameters', () => {
    const url = 'https://example.com/path?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale';
    expect(normalizeUrl(url)).toBe('https://example.com/path/');
  });

  it('should strip UTM parameters and keep other query parameters', () => {
    const url = 'https://example.com/path?id=123&utm_source=google&lang=en';
    expect(normalizeUrl(url)).toBe('https://example.com/path/?id=123&lang=en');
  });

  it('should handle URLs with no path correctly', () => {
    expect(normalizeUrl('https://example.com?utm_source=google')).toBe('https://example.com/');
  });
  
  it('should correctly handle a complex URL', () => {
    const url = 'https://SUB.EXAMPLE.co.uk/Some/Path?utm_campaign=abc&id=456&utm_source=xyz#hash';
    expect(normalizeUrl(url)).toBe('https://sub.example.co.uk/Some/Path/?id=456#hash');
  });

  it('should return the original string for an invalid URL', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });

  it('should handle URLs with existing query params and no trailing slash', () => {
    expect(normalizeUrl('https://example.com/path?id=123')).toBe('https://example.com/path/?id=123');
  });
});