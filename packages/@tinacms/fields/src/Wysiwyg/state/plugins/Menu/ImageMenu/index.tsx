/**

Copyright 2019 Forestry.io Inc

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

import React, { useState, useRef, useEffect } from 'react'
import { EditorView } from 'prosemirror-view'
import debounce from 'lodash/debounce'
import styled from 'styled-components'
import { TinaReset, radius, color, font } from '@tinacms/styles'

import { findElementOffsetTop, findElementOffsetLeft } from '../../../../utils'
import { imagePluginKey } from '../../Image'
import { NodeSelection } from 'prosemirror-state'

interface FloatingImageMenu {
  view: EditorView
}

export default (props: FloatingImageMenu) => {
  const { view } = props
  const { selectedImage } = imagePluginKey.getState(view.state)
  if (!selectedImage) return null
  const { node, pos } = selectedImage
  const [title, setTitle] = useState(node.attrs.title)
  const [alt, setAlt] = useState(node.attrs.alt)
  const [linkTitle, setLinkTitle] = useState()
  const [linkSrc, setLinkSrc] = useState()
  const { top, left } = view.coordsAtPos(pos)
  const [modalTop, setModalTop] = useState(top)
  const [modalLeft, setModalLeft] = useState(left)
  const imageRef = useRef() as React.MutableRefObject<HTMLImageElement>
  const [linked, toggleLinked] = useState(false)

  function positionImage(scroll?: boolean) {
    const image = document.getElementsByClassName('tina-selected-image')[0]
    if (image && (imageRef.current !== image || scroll)) {
      imageRef.current = image as any
      setModalLeft(findElementOffsetLeft(image.parentElement as HTMLElement))
      setModalTop(findElementOffsetTop(image.parentElement as HTMLElement))
    }
  }

  useEffect(() => {
    const debouncedPositionImage = debounce(() => positionImage(true), 20)
    window.addEventListener('scroll', debouncedPositionImage)
    return () => {
      window.removeEventListener('scroll', debouncedPositionImage)
    }
  })
  useEffect(positionImage)

  const updateNodeAttrs = () => {
    const { dispatch, state } = view
    const { image } = state.schema.nodes
    const { link } = state.schema.marks
    const { tr } = state
    if (linked) {
      tr.addMark(pos, pos + 1, link.create({ href: linkSrc, title: linkTitle }))
    } else {
      tr.removeMark(pos, pos + 1, link)
    }
    tr.setNodeMarkup(pos, image, {
      ...node.attrs,
      alt,
      title,
    }).setSelection(new NodeSelection(tr.doc.resolve(pos)))
    dispatch(tr)
    view.focus()
  }

  const closeImageSettings = () => {
    const { dispatch, state } = view
    dispatch(state.tr.setMeta('image_clicked', false))
  }

  return (
    <TinaReset>
      <LinkPopup top={modalTop} left={modalLeft}>
        <LinkLabel>Title</LinkLabel>
        <LinkInput
          placeholder="Enter Title"
          type={'text'}
          value={title}
          onChange={evt => setTitle(evt.target.value)}
        />
        <LinkLabel>Alt</LinkLabel>
        <LinkInput
          placeholder="Enter Alt Text"
          autoFocus
          type={'text'}
          value={alt}
          onChange={evt => setAlt(evt.target.value)}
        />
        <input
          type="checkbox"
          checked={linked}
          onChange={() => {
            toggleLinked(!linked)
            if (!linked) {
              setLinkTitle('')
              setLinkSrc('')
            }
          }}
        />
        Linked
        {linked && (
          <>
            <LinkLabel>Link Title</LinkLabel>
            <LinkInput
              placeholder="Enter Link Title"
              autoFocus
              type={'text'}
              value={linkTitle}
              onChange={evt => setLinkTitle(evt.target.value)}
            />
            <LinkLabel>Link URL</LinkLabel>
            <LinkInput
              placeholder="Enter Link URL"
              type={'text'}
              value={linkSrc}
              onChange={evt => setLinkSrc(evt.target.value)}
            />
          </>
        )}
        <LinkActions>
          <CancelLink onClick={closeImageSettings}>Cancel</CancelLink>
          <SaveLink onClick={updateNodeAttrs}>Save</SaveLink>
        </LinkActions>
      </LinkPopup>
    </TinaReset>
  )
}

const LinkPopup = styled.span<{
  left: number
  top: number
}>`
  background-color: #f6f6f9;
  position: absolute;
  height: max-content;
  border-radius: ${radius('small')};
  border: 1px solid ${color.grey(2)};
  filter: drop-shadow(0px 4px 8px rgba(48, 48, 48, 0.1))
    drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.12));
  transform-origin: 50% 0;
  overflow: visible;
  padding: 12px;
  z-index: 10;
  width: 16rem;
  left: ${({ left }) => `${left}px`};
  top: ${({ top }) => `${top}px`};
`

const LinkLabel = styled.label`
  display: block;
  font-size: ${font.size(1)};
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${color.grey(8)};
  margin-bottom: 3px;
`

const LinkInput = styled.input`
  position: relative;
  background-color: white;
  border-radius: ${radius('small')};
  font-size: ${font.size(1)};
  line-height: 1.35;
  transition: all 85ms ease-out;
  padding: 8px 12px;
  border: 1px solid ${color.grey(2)};
  width: 100%;
  margin: 0 0 8px 0;
  outline: none;
  box-shadow: 0 0 0 2px transparent;

  &:hover {
    box-shadow: 0 0 0 2px ${color.grey(3)};
  }

  &:focus {
    box-shadow: 0 0 0 2px #0084ff;
  }

  &::placeholder {
    font-size: ${font.size(2)};
    color: #cfd3d7;
  }
`

const LinkActions = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
`

const SaveLink = styled.button`
  text-align: center;
  border: 0;
  border-radius: ${radius()};
  box-shadow: 0px 2px 3px rgba(0, 0, 0, 0.12);
  background-color: #0084ff;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 85ms ease-out;
  font-size: ${font.size(0)};
  padding: 8px 20px;
  margin-left: 8px;
  &:hover {
    background-color: #2296fe;
  }
  &:active {
    background-color: #0574e4;
  }
`

const CancelLink = styled(SaveLink)`
  background-color: white;
  border: 1px solid ${color.grey(2)};
  color: #0084ff;
  &:hover {
    background-color: #f6f6f9;
    opacity: 1;
  }
`
