import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const load: PageServerLoad = async () => {
  try {
    // Read the terms of service markdown file
    const filePath = join(process.cwd(), 'src', 'lib', 'assets', 'docs', 'terms-of-service-id.md');
    const termsContent = await readFile(filePath, 'utf-8');
    
    return {
      termsContent
    };
  } catch (err) {
    console.error('Error reading terms of service file:', err);
    error(500, 'Unable to load terms of service');
  }
};