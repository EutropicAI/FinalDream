import type { IpcMainInvokeEvent } from 'electron'
import { dialog } from 'electron'

/**
 * @description Open a directory or file/multiple files
 * @param _event Unused parameter, but kept for IPC handler consistency
 * @param p The properties of the dialog
 */
export async function openDirectory(_event: IpcMainInvokeEvent, p: Array<'openFile' | 'openDirectory' | 'multiSelections'>): Promise<Array<string>> {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: p })
    return canceled ? [] : filePaths
  }
  catch (error) {
    console.error('Error opening directory dialog:', error)
    return []
  }
}
