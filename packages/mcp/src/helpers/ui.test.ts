import { Warp } from '@vleap/warps'
import fetchMock from 'jest-fetch-mock'
import { createAppResource } from './ui'

const mockConfig = { env: 'mainnet' as const }

describe('createAppResource', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  it('creates app resource with basic HTML', async () => {
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
      ui: 'https://example.com/app.html',
      meta: {
        identifier: 'test_app',
      },
    }

    const mockHtml = '<html><head></head><body>Test Content</body></html>'
    fetchMock.mockResponseOnce(mockHtml)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    expect(result!.name).toBe('test_app')
    expect(result!.uri).toBe('ui://widget/test_app')
    expect(result!.mimeType).toBe('text/html+skybridge')
    expect(result!.description).toBe('ChatGPT app for test_app')
    const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
      warp: { name: 'test_app', title: 'Test App', description: 'Test description' },
    })}</script>`
    expect(result!.content).toBe(`${dataScript}\nTest Content`)
  })

  it('inlines CSS resources', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'css_test',
      title: { en: 'CSS Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/app.html',
      meta: {
        identifier: 'css_test',
      },
    }

    const mockHtml = '<html><head><link rel="stylesheet" href="styles.css"></head><body></body></html>'
    const mockCss = 'body { color: red; }'

    fetchMock.mockResponseOnce(mockHtml).mockResponseOnce(mockCss)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
      warp: { name: 'css_test', title: 'CSS Test' },
    })}</script>`
    expect(result!.content).toBe(`${dataScript}\n<style>body { color: red; }</style>`)
  })

  it('inlines JavaScript resources', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'js_test',
      title: { en: 'JS Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/app.html',
      meta: {
        identifier: 'js_test',
      },
    }

    const mockHtml = '<html><head></head><body><script src="app.js"></script></body></html>'
    const mockJs = "console.log('test');"

    fetchMock.mockResponseOnce(mockHtml).mockResponseOnce(mockJs)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
      warp: { name: 'js_test', title: 'JS Test' },
    })}</script>`
    expect(result!.content).toBe(`${dataScript}\n<script>console.log('test');</script>`)
  })

  it('handles relative URLs in resources', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'relative_url_test',
      title: { en: 'Relative URL Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/path/app.html',
      meta: {
        identifier: 'relative_url_test',
      },
    }

    const mockHtml = '<html><head><link rel="stylesheet" href="../styles.css"></head><body></body></html>'
    const mockCss = 'body { margin: 0; }'

    fetchMock.mockResponseOnce(mockHtml).mockResponseOnce(mockCss)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
      warp: { name: 'relative_url_test', title: 'Relative URL Test' },
    })}</script>`
    expect(result!.content).toBe(`${dataScript}\n<style>body { margin: 0; }</style>`)
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/styles.css')
  })

  it('handles failed resource downloads gracefully', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'failed_resource_test',
      title: { en: 'Failed Resource Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/app.html',
      meta: {
        identifier: 'failed_resource_test',
      },
    }

    const mockHtml = '<html><head><link rel="stylesheet" href="missing.css"></head><body></body></html>'

    fetchMock.mockResponseOnce(mockHtml).mockResponseOnce('', { status: 404 })

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
      warp: { name: 'failed_resource_test', title: 'Failed Resource Test' },
    })}</script>`
    expect(result!.content.trim()).toBe(dataScript)
  })

  it('handles multiple CSS and JS resources in parallel', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'multiple_resources_test',
      title: { en: 'Multiple Resources Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/app.html',
      meta: {
        identifier: 'multiple_resources_test',
      },
    }

    const mockHtml =
      '<html><head><link rel="stylesheet" href="style1.css"><link rel="stylesheet" href="style2.css"></head><body><script src="app1.js"></script><script src="app2.js"></script></body></html>'

    fetchMock
      .mockResponseOnce(mockHtml)
      .mockResponseOnce('body { color: red; }')
      .mockResponseOnce('body { margin: 0; }')
      .mockResponseOnce("console.log('app1');")
      .mockResponseOnce("console.log('app2');")

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
      warp: { name: 'multiple_resources_test', title: 'Multiple Resources Test' },
    })}</script>`
    const expectedContent = `${dataScript}\n<style>body { color: red; }</style><style>body { margin: 0; }</style><script>console.log('app1');</script><script>console.log('app2');</script>`
    expect(result!.content).toBe(expectedContent)
  })

  it('strips HTML tags correctly', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'strip_test',
      title: { en: 'Strip Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/app.html',
      meta: {
        identifier: 'strip_test',
      },
    }

    const mockHtml = '<html><head><style>body { margin: 0; }</style></head><body><div>Content</div></body></html>'
    fetchMock.mockResponseOnce(mockHtml)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
      warp: { name: 'strip_test', title: 'Strip Test' },
    })}</script>`
    expect(result!.content).toBe(`${dataScript}\n<style>body { margin: 0; }</style><div>Content</div>`)
  })

  it('handles app download failure', async () => {
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
      ui: 'https://example.com/missing.html',
    }

    fetchMock.mockResponseOnce('', { status: 404 })

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeNull()
  })

  it('injects warp metadata correctly', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'metadata_test',
      title: { en: 'Metadata Test' },
      description: { en: 'Test description' },
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/app.html',
      meta: {
        identifier: 'metadata_test',
      },
    }

    const mockHtml = '<html><head></head><body>Test</body></html>'
    fetchMock.mockResponseOnce(mockHtml)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
      warp: { name: 'metadata_test', title: 'Metadata Test', description: 'Test description' },
    })}</script>`
    expect(result!.content).toBe(`${dataScript}\nTest`)
  })
})
