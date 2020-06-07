import {browser} from 'webextension-polyfill-ts';
import type * as B from 'webextension-polyfill-ts'; // eslint-disable-line no-unused-vars
import React from 'react';
import {StyleSheet, css} from 'aphrodite';
import _ from 'lodash';
import tc from 'tinycolor2';
import v from 'vquery'
import {map, each, filter, findIndex} from '@jaszhix/utils';
import Slider from 'rc-slider';
import ReactTooltip from 'react-tooltip';

import * as utils from '../stores/tileUtils';
import {urlRegex} from '../../shared/constants';
import state from '../stores/state';
import {syncPermissions, getPermissions, setPrefs} from '../stores/main';

import {Btn, Col, Row} from '../bootstrap';
import {Toggle, OriginEntry} from './preferences';

const optionalPermissions = [
    'activeTab',
    'downloads',
    'bookmarks',
    'history',
    'management',
];

const permissionLabels = {
  activeTab: 'Capture active tab (screenshot capturing)',
  downloads: 'Manage your downloads (export sessions, themes)',
  bookmarks: 'Read and change your bookmarks',
  history: 'Read and change your browsing history',
  management: 'Manage your apps, extensions, and themes',
}

export interface PermissionsProps {
}

export interface PermissionsState {
  permissions: string[],
  origins: string[],
  newOriginValue: string;
}

class Permissions extends React.Component<PermissionsProps, PermissionsState> {
  constructor(props) {
    super(props);

    this.state = {
      permissions: [],
      origins: [],
      newOriginValue: '',
    };
  }

  componentDidMount = () => {
    let {modal} = state;

    modal.footer = <div style={{height: '32px'}} />;

    state.set({modal}, true);
    this.getPermissions();
  }

  getPermissions = async () => {
    let {permissions, origins} = await getPermissions();

    this.setState({permissions, origins});
  }

  handlePermissionToggle = async (permission: B.Manifest.OptionalPermission) => {
    let {permissions} = this.state;
    let enabled = !permissions.includes(permission);

    try {
      if (enabled) {
        await browser.permissions.request({permissions: [permission]});
      } else {
        await browser.permissions.remove({permissions: [permission]});
      }
    } catch (e) {
      console.log(e)
      return;
    }

    await syncPermissions();
    await this.getPermissions();
  }

  handleOriginToggle = async (origin: string) => {
    let {origins} = this.state;
    let enabled = !origins.includes(origin);

    try {
      if (enabled) {
        origins.push(origin);
        await browser.permissions.request({origins});
      } else {
        await browser.permissions.remove({origins: [origin]});

        if (origin === '<all_urls>') {
          origins.splice(origins.indexOf(origin), 1);
          await browser.permissions.request({origins});

          setPrefs({screenshot: false});
        }
      }
    } catch (e) {
      console.log(e);
      return;
    }

    await syncPermissions();
    await this.getPermissions();
  }

  handleOriginValueChange = (e) => {
    this.setState({newOriginValue: e.target.value});
  }

  handleNewOriginKeyDown = async (e) => {
    if (e.keyCode !== 13) return;

    let {newOriginValue} = this.state;

    await browser.permissions.request({origins: [newOriginValue]});

    await syncPermissions();
    await this.getPermissions();

    this.setState({newOriginValue: ''});
  }

  render = () => {
    let {permissions, origins, newOriginValue} = this.state;
    let allUrlsEnabled = origins.includes('<all_urls>');

    console.log(permissions, origins, allUrlsEnabled)

    if (!permissions.length) return null;

    return (
      <div className="sessions">
        <Col size="6">
          <h4>Permissions</h4>
          <Row>
            {map(optionalPermissions, (permission: string) => {
              return (
                <Toggle
                  key={permission}
                  dataId={permission}
                  onClick={this.handlePermissionToggle}
                  on={permissions.includes(permission)}
                  label={permissionLabels[permission]}
                />
              )
            })}
          </Row>
        </Col>
        <Col size="6">
          <h4 data-tip={`<div style="max-width: 400px;">Matching URL patterns of websites TM5K is allowed to read and change data from. This is used for screenshot capturing and caching favicons for later use. Limiting the origin scope will result in the extension redownloading website favicons.</div>`}>Origins</h4>
          <Row>
            <Toggle
              dataId="<all_urls>"
              onClick={this.handleOriginToggle}
              on={allUrlsEnabled}
              label="Allow all origins"
            />
            {!allUrlsEnabled ?
              <>
                <input
                  type="url"
                  className="form-control settings origin"
                  placeholder="New Origin"
                  value={newOriginValue}
                  onChange={this.handleOriginValueChange}
                  onKeyDown={this.handleNewOriginKeyDown}
                />

                {map(filter(origins, (origin) => origin !== '<all_urls>'), (origin: string) => {
                  return (
                    <OriginEntry
                      key={origin}
                      dataId={origin}
                      onClick={this.handleOriginToggle}
                      label={origin}
                    />
                  )
                })}
              </> : null}
          </Row>
        </Col>
      </div>
    );
  }
}

export default Permissions;