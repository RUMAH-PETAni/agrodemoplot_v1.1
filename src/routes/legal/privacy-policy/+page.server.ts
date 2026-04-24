import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const load: PageServerLoad = async () => {
  try {
    // Read the privacy policy markdown file
    const filePath = join(process.cwd(), 'src', 'lib', 'assets', 'docs', 'privacy-policy-id.md');
    const privacyContent = await readFile(filePath, 'utf-8');
    
    return {
      privacyContent
    };
  } catch (err) {
    console.error('Error reading privacy policy file:', err);
    error(500, 'Unable to load privacy policy');
  }
};