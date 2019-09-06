import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {indexForPositionOnList} from './drag-utils';

const SortableHOC = function (WrappedComponent) {
    class SortableWrapper extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'setContainerRef',
                'setScrollRef',
                'handleAddSortable',
                'handleRemoveSortable'
            ]);

            this.sortableRefs = [];
            this.boxes = null;
            this.ref = null;
            this.scrollRef = null;
            this.containerBox = null;
            this.initialScrollPosition = null;
            this.scrollTop = 0;
            this.scrollLeft = 0;
        }

        componentWillReceiveProps (newProps) {
            if (newProps.dragInfo.dragging && !this.props.dragInfo.dragging) {
                // Drag just started, snapshot the sorted bounding boxes for sortables.
                this.boxes = this.sortableRefs.map(el => el && el.getBoundingClientRect());
                this.boxes.sort((a, b) => { // Sort top-to-bottom, left-to-right.
                    if (a.top === b.top) return a.left - b.left;
                    return a.top - b.top;
                });
                if (!this.ref) {
                    throw new Error('The containerRef must be assigned to the sortable area');
                }
                this.containerBox = this.ref.getBoundingClientRect();
                if (!this.scrollRef) {
                    throw new Error('The scrollRef must be assigned to the scrollable area');
                }
                this.initialScrollPosition = {
                    x: this.scrollRef.scrollLeft,
                    y: this.scrollTop
                };
            } else if (!newProps.dragInfo.dragging && this.props.dragInfo.dragging) {
                const newIndex = this.getMouseOverIndex();
                if (newIndex !== null) {
                    this.props.onDrop(Object.assign({}, this.props.dragInfo, {newIndex}));
                }
            }
        }

        handleAddSortable (node) {
            this.sortableRefs.push(node);
        }

        handleRemoveSortable (node) {
            const index = this.sortableRefs.indexOf(node);
            this.sortableRefs = this.sortableRefs.slice(0, index)
                .concat(this.sortableRefs.slice(index + 1));
        }

        getOrdering (items, draggingIndex, newIndex) {
            // An "Ordering" is an array of indices, where the position array value corresponds
            // to the position of the item in props.items, and the index of the value
            // is the index at which the item should appear.
            // That is, if props.items is ['a', 'b', 'c', 'd'], and we want the GUI to display
            // ['b', 'c', 'a, 'd'], the value of "ordering" would be [1, 2, 0, 3].
            // This mapping is used because it is easy to translate to flexbox ordering,
            // the `order` property for item N is ordering.indexOf(N).
            // If the user-facing order matches props.items, the ordering is just [0, 1, 2, ...]
            let ordering = Array(this.props.items.length).fill(0)
                .map((_, i) => i);
            const isNumber = v => typeof v === 'number' && !isNaN(v);
            if (isNumber(draggingIndex) && isNumber(newIndex)) {
                ordering = ordering.slice(0, draggingIndex).concat(ordering.slice(draggingIndex + 1));
                ordering.splice(newIndex, 0, draggingIndex);
            }
            return ordering;
        }

        getMouseOverIndex () {
            // MouseOverIndex is the index that the current drag wants to place the
            // the dragging object. Obviously only exists if there is a drag (i.e. currentOffset).
            // Return null if outside the container, zero if there are no boxes.
            let mouseOverIndex = null;
            if (this.props.dragInfo.currentOffset) {
                let {x, y} = this.props.dragInfo.currentOffset;
                const {top, left, bottom, right} = this.containerBox;
                if (this.scrollTop !== 0) {
                    console.log('Pre:', y >= top, y);
                }
                if (x >= left && x <= right && y >= top && y <= bottom) {
                    console.log('-- Post:', y >= top, y);
                    console.log('-- Scroll:', this.scrollTop);
                    // x += this.scrollOffset.x;
                    y += this.scrollTop - this.initialScrollPosition.y;
                    if (this.scrollTop !== 0) {
                        // console.log(this.ref.scrollTop, this.initialScrollPosition.y);
                        // console.log(this.scrollRef.scrollTop - this.initialScrollPosition.y);
                    }
                    if (this.boxes.length === 0) {
                        mouseOverIndex = 0;
                    } else {
                        mouseOverIndex = indexForPositionOnList({x, y}, this.boxes);
                    }
                }
            }
            return mouseOverIndex;
        }

        setContainerRef (el) {
            this.ref = el;
        }

        setScrollRef (el) {
            this.scrollRef = el;

            // *** PROBABLY IRRELEVANT. ***
            // Doesn't fix the bug of flickering when you drag over the very
            // top of the scrollable area. For future writing: just use these
            // values directly in math, i.e. this.scrollRef.scrollTop, etc.
            this.scrollRef.addEventListener('scroll', () => {
                this.scrollLeft = el.scrollLeft;
                this.scrollTop = el.scrollTop;
            });
        }

        render () {
            const {dragInfo: {index: dragIndex, dragType}, items} = this.props;
            const mouseOverIndex = this.getMouseOverIndex();
            const ordering = this.getOrdering(items, dragIndex, mouseOverIndex);
            return (
                <WrappedComponent
                    containerRef={this.setContainerRef}
                    draggingIndex={dragIndex}
                    draggingType={dragType}
                    mouseOverIndex={mouseOverIndex}
                    ordering={ordering}
                    onAddSortable={this.handleAddSortable}
                    onRemoveSortable={this.handleRemoveSortable}
                    scrollRef={this.setScrollRef}
                    {...this.props}
                />
            );
        }
    }

    SortableWrapper.propTypes = {
        dragInfo: PropTypes.shape({
            currentOffset: PropTypes.shape({
                x: PropTypes.number,
                y: PropTypes.number
            }),
            dragType: PropTypes.string,
            dragging: PropTypes.bool,
            index: PropTypes.number
        }),
        items: PropTypes.arrayOf(PropTypes.shape({
            url: PropTypes.string,
            name: PropTypes.string.isRequired
        })),
        onClose: PropTypes.func,
        onDrop: PropTypes.func
    };

    const mapStateToProps = state => ({
        dragInfo: state.scratchGui.assetDrag
    });

    const mapDispatchToProps = () => ({});

    return connect(
        mapStateToProps,
        mapDispatchToProps
    )(SortableWrapper);
};

export default SortableHOC;
