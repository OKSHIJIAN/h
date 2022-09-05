import { withTranslation } from 'react-i18next';

import React, { Component } from "react";
import { Layout, PageHeader, Badge, Input, message, Modal, Statistic, Row, Col, Card, Select, Typography, Upload, Button, Space, Form, Radio, Divider, Collapse, Checkbox, Tabs, Steps } from 'antd';
import { FileOutlined, AimOutlined, ToolOutlined, ExportOutlined, ExperimentOutlined, SyncOutlined } from '@ant-design/icons';

import Pluralize from 'pluralize';

import CapJs from './lib/capjs';
import hex2a from './lib/hex2a';
import filename from './lib/filename';

const { Content } = Layout;
const { Dragger } = Upload;
const { Option } = Select;
const { Title, Paragraph, Text, Link } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Step } = Steps;

class Tools extends Component {
	constructor(props) {
		super(props);

		this.onClickOpenCapConverterTool = this.onClickOpenCapConverterTool.bind(this);
		this.onOkCapConverterTool = this.onOkCapConverterTool.bind(this);
		this.onCancelCapConverterTool = this.onCancelCapConverterTool.bind(this);
		this.onChangeCapConverterToolInput = this.onChangeCapConverterToolInput.bind(this);
		this.onChangeCapConverterToolSave = this.onChangeCapConverterToolSave.bind(this);

		this.state = {
			capConverterToolIsOpen: false,
			capConverterToolStatus: "idle",
			capConverterToolOutput: null,
			capConverterToolError: null,
			capConverterToolSave: true
		}
	}

	onClickOpenCapConverterTool() {
		this.setState({
			capConverterToolIsOpen: true
		})
	}

	onOkCapConverterTool() {
		this.setState({
			capConverterToolIsOpen: false
		})
	}

	onCancelCapConverterTool() {
		this.setState({
			capConverterToolIsOpen: false
		})
	}

	onChangeCapConverterToolInput(e) {
		var fileList = e.fileList;

		if (fileList.length === 0)
			return;

		if (this.state.capConverterToolSave && typeof window.GOsaveHash !== "function") {
			message.error("GOsaveHash is not a function");
			return;
		}

		this.setState({
			capConverterToolStatus: "processing",
			capConverterToolOutput: null,
			capConverterToolError: null
		}, () => {
			var file = fileList[0].originFileObj;
			var format = file.name.split('.').pop().toLowerCase();
			if (format == "gz")
				format = file.name.split('.').slice(-2).join('.');
			var bestOnly = true;
			var exportUnauthenticated = false;
			var ignoreTs = false;
			var ignoreIe = false;

			var reader = new FileReader();
			reader.onload = () => {
				const myCap = new CapJs(reader.result, format, bestOnly, exportUnauthenticated, ignoreTs, ignoreIe);
				myCap.Analysis();
				
				const hcwpax = (myCap.Getf('hcwpax'));
				if (hcwpax.length > 0) {
					if (this.state.capConverterToolSave) {
						const numNetworks = hcwpax.trim().split('\n').length;
						var outputFileName;
						if (numNetworks === 1) {
							const parts = hcwpax.split("*");
							const bssid = parts[3].toUpperCase().replace(/.{2}(?!$)/g, '$&-');
							const essid = hex2a(parts[5]) || "NOESSID";
							outputFileName = essid+" ("+bssid+").hcwpax";
						} else {
							outputFileName = numNetworks+ " Networks.hcwpax";
						}
						window.GOsaveHash(btoa(hcwpax), outputFileName).then(
							response => {
								message.success(this.props.t("tools.cap_to_hcwpax.save_hash_success") + " " + filename(response));
								this.setState({
									capConverterToolStatus: "success",
									capConverterToolOutput: hcwpax,
									capConverterToolError: null
								});
							},
							error => {
								message.warning(this.props.t("tools.cap_to_hcwpax.save_hash_error") + ", " + error);
								this.setState({
									capConverterToolStatus: "success",
									capConverterToolOutput: hcwpax,
									capConverterToolError: null
								});
							}
						);
					} else {
						this.setState({
							capConverterToolStatus: "success",
							capConverterToolOutput: hcwpax,
							capConverterToolError: null
						});
					}
				} else {
					this.setState({
						capConverterToolStatus: "error",
						capConverterToolOutput: null,
						capConverterToolError: myCap.log.pop()
					})
				}
			}
			reader.readAsArrayBuffer(file);
		});
	}

	onChangeCapConverterToolSave(e) {
		this.setState({
			capConverterToolSave: e.target.checked
		})
	}

	render() {
		const LANG = this.props.t;
		return (
			<>
				<PageHeader
					title={LANG('tools.title')}
				/>
				<Content style={{ padding: '16px 24px' }}>
					<Row gutter={[16, 14]}>
						<Col>
							<Card
								title={LANG('tools.cap_to_hcwpax.title')}
								extra={<Button type="link" style={{ padding: '0' }} onClick={this.onClickOpenCapConverterTool}>{LANG('tools.cap_to_hcwpax.open_tool')}</Button>}
							>
								<p>{LANG('tools.cap_to_hcwpax.description.part1')}</p>
								<p>{LANG('tools.cap_to_hcwpax.description.part2')}</p>
							</Card>
							<Modal
								title={LANG('tools.cap_to_hcwpax.title')}
								okText={LANG('tools.cap_to_hcwpax.modal_ok')}
								cancelText={LANG('tools.cap_to_hcwpax.modal_cancel')}
								visible={this.state.capConverterToolIsOpen}
								onOk={this.onOkCapConverterTool}
								onCancel={this.onCancelCapConverterTool}
							>
								<Row gutter={[16, 14]}>
									<Col span={24}>
										<Space>
											<Upload
												accept=".cap,.pcap,.pcapng,.cap.gz,.pcap.gz,.pcapng.gz"
												maxCount={1}
												showUploadList={false}
												onChange={this.onChangeCapConverterToolInput}
												disabled={this.state.capConverterToolStatus === "processing"}
												beforeUpload={() => {return false;}}
											>
												<Button type="primary">
													{LANG('tools.cap_to_hcwpax.choose_capture_file')}
												</Button>
											</Upload>
											<Checkbox
												checked={this.state.capConverterToolSave}
												onChange={this.onChangeCapConverterToolSave}
												disabled={this.state.capConverterToolStatus === "processing"}
											>
												{LANG('tools.cap_to_hcwpax.save_output_to_hashes')}
											</Checkbox>
										</Space>
									</Col>
									<Col span={24}>
										<Paragraph>
											{this.state.capConverterToolStatus === "idle" ? (
												<Badge status="default" text={LANG('tools.cap_to_hcwpax.idle')} />
											) : this.state.capConverterToolStatus === "processing" ? (
												<Badge status="processing" text={LANG('tools.cap_to_hcwpax.processing')} />
											) : this.state.capConverterToolStatus === "success" ? (
												<Badge status="success" text={LANG('tools.cap_to_hcwpax.success') + " ("+Pluralize("network", this.state.capConverterToolOutput.trim().split('\n').length, true)+")"} />
											) : this.state.capConverterToolStatus === "error" ? (
												this.state.capConverterToolError ? (
													<Badge status="error" text={this.state.capConverterToolError} />
												) : (
													<Badge status="error" text={LANG('tools.cap_to_hcwpax.unknown_error')} />
												)
											) : (
												<Badge status="default" text={LANG('tools.cap_to_hcwpax.unknown_status')} />
											)}
											{this.state.capConverterToolOutput &&
												<>
												<pre>
													<Text code copyable ellipsis>
														{this.state.capConverterToolOutput}
													</Text>
												</pre>
												{this.state.capConverterToolOutput.trim().split('\n').length > 1 &&
													<>
													<Divider>{LANG('tools.cap_to_hcwpax.separated_hashes')}</Divider>
													<pre>
														{this.state.capConverterToolOutput.trim().split('\n').map(wpahash => (
															<Text code copyable ellipsis>
																{wpahash}
															</Text>
														))}
													</pre>
													</>
												}
												</>
											}
										</Paragraph>
									</Col>
								</Row>
							</Modal>
						</Col>
					</Row>
				</Content>
			</>
		)
	}
}

export default withTranslation()(Tools);
