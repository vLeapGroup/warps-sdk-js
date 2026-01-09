import { Warp, WarpChainName } from '@joai/warps'
import fetchMock from 'jest-fetch-mock'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppResource } from './ui'

const mockConfig = { env: 'mainnet' as const }

describe('createAppResource', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  it('creates app resource with bundled component from URL', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_app',
      title: { en: 'Test App' },
      description: { en: 'Test description' },
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/component.js',
      meta: {
        chain: 'multiversx' as WarpChainName,
        identifier: 'test_app',
        query: null,
        hash: 'test_hash',
        creator: 'test_creator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    }

    const mockComponentCode = `import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return React.createElement('div', null, 'Hello World');
}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));`

    fetchMock.mockResponseOnce(mockComponentCode)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    expect(result!.name).toBe('test_app')
    expect(result!.uri).toBe('ui://widget/test_app')
    expect(result!.mimeType).toBe('text/html+skybridge')
    expect(result!.description).toBe('ChatGPT app for test_app')
    expect(result!.content).toBe(`<div id="root"></div>
<script type="module">${mockComponentCode}</script>`.trim())
  })

  it('handles component download failure', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'download_fail_test',
      title: { en: 'Download Fail Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/missing.js',
      meta: {
        chain: 'multiversx' as WarpChainName,
        identifier: 'download_fail_test',
        query: null,
        hash: 'test_hash',
        creator: 'test_creator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    }

    fetchMock.mockResponseOnce('', { status: 404 })

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeNull()
  })

  it('creates widget template with minimal structure', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'structure_test',
      title: { en: 'Structure Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/component.js',
      meta: {
        chain: 'multiversx' as WarpChainName,
        identifier: 'structure_test',
        query: null,
        hash: 'test_hash',
        creator: 'test_creator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    }

    const mockComponentCode = 'console.log("test");'
    fetchMock.mockResponseOnce(mockComponentCode)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    expect(result!.content).toBe(`<div id="root"></div>
<script type="module">${mockComponentCode}</script>`.trim())
    expect(result!.content).toMatch(/<div id="root"><\/div>/)
    expect(result!.content).toMatch(/<script type="module">/)
    expect(result!.content).toContain(mockComponentCode)
  })

  it('returns null when warp has no meta identifier', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'no_meta_test',
      title: { en: 'No Meta Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/component.js',
    }

    const mockComponentCode = 'console.log("test");'
    fetchMock.mockResponseOnce(mockComponentCode)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeNull()
  })

  it('loads component from local file path', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'local_file_test',
      title: { en: 'Local File Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: './dist/component.js',
      meta: {
        chain: 'multiversx' as WarpChainName,
        identifier: 'local_file_test',
        query: null,
        hash: 'test_hash',
        creator: 'test_creator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    }

    // Create a temporary file for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'warp-test-'))
    const componentPath = path.join(tempDir, 'component.js')
    const componentCode = 'console.log("local component");'
    fs.writeFileSync(componentPath, componentCode)

    try {
      const result = await createAppResource(warp, componentPath, mockConfig)

      expect(result).toBeDefined()
      expect(result!.name).toBe('local_file_test')
      expect(result!.content).toBe(`<div id="root"></div>
<script type="module">${componentCode}</script>`.trim())
    } finally {
      // Cleanup
      fs.unlinkSync(componentPath)
      fs.rmdirSync(tempDir)
    }
  })
})
